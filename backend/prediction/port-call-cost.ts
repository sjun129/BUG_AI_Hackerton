// 입항 1건의 총 비용(운영자 관점) — ML 없이 결정론적. 기존 연료·탄소 모델을 재사용하고
// 예선료·대기(체선)비용·선원 인건비·냉동컨테이너 전력비를 더해 "총 입항 비용" 내역을 만든다.
//
// 구성 항목과 근거:
//   1) 항해 연료비 — fuel.ts voyageFuelTon() × 연료단가. 항해 구간(distanceNm)이 있을 때만.
//   2) 정박 연료비 — fuel.ts hotelingFuelRate() × 정박시간 × 연료단가("정박 중 연료소비"의 비용화).
//   3) 입항료(+환경차등) — carbon-port-due.ts computeCarbonPortDue() 그대로 재사용
//      (표준 입항료 + 탄소부담금 + CII 등급 차등을 이미 계산해 준다).
//   4) 예선료 — GT 구간별 정액(seed-port.ts portCallCost.tugFeeTiers).
//   5) 대기(체선)비용 — "대기시간"으로 지정한 구간에 규모별 시간당 기회비용을 곱한다(용선료 상당 근사).
//   6) 선원 인건비 — crewCount(또는 규모별 대체값) × 일당 × 재항일수.
//   7) 냉동컨테이너 전력비 — 냉동선(reefer)에만: GT→TEU 근사 × 시간당 전력단가 × 정박시간.
//
// 각 항목은 개별 함수로도 export해 필요한 부분만 재사용할 수 있게 한다.

import type { PortConfig } from "../ports/port-types";
import { normalizeVesselType } from "../data/energy";
import { FUEL_PRICE_USD_PER_TON, hotelingFuelRate, voyageFuelTon, type FuelType } from "./fuel";
import { computeCarbonPortDue, type CarbonPortDue } from "./carbon-port-due";

type SizeTier = "small" | "medium" | "large";

// fuel.ts의 비공개 sizeTier와 동일 경계(<10,000 / <50,000 / 이상)를 써서 두 모델의 규모 구분을 맞춘다.
function sizeTier(grossTonnage: number): SizeTier {
  if (grossTonnage < 10_000) return "small";
  if (grossTonnage < 50_000) return "medium";
  return "large";
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export interface FuelCostLeg {
  tonnage: number;
  fuelType: FuelType;
  costUsd: number;
}

/** GT 구간별 정액 예선료. tiers는 maxGrossTonnage 오름차순이어야 한다. */
export function computeTugFeeUsd(grossTonnage: number, config: PortConfig): number {
  const tier = config.portCallCost.tugFeeTiers.find((t) => grossTonnage <= t.maxGrossTonnage);
  return tier?.feeUsd ?? config.portCallCost.tugFeeTiers[config.portCallCost.tugFeeTiers.length - 1]?.feeUsd ?? 0;
}

/** 대기(체선)시간 × 규모별 시간당 기회비용(용선료 상당 근사). */
export function computeWaitingCostUsd(waitingHours: number, grossTonnage: number, config: PortConfig): number {
  const rate = config.portCallCost.waitingCostUsdPerHourBySizeTier[sizeTier(grossTonnage)];
  return Math.max(0, waitingHours) * rate;
}

/** 선원 인건비 = 인원수(실측 또는 규모별 대체값) × 일당 × 재항일수. */
export function computeCrewLaborCostUsd(
  berthHours: number,
  grossTonnage: number,
  config: PortConfig,
  crewCount?: number
): number {
  const crew = crewCount ?? config.portCallCost.defaultCrewBySizeTier[sizeTier(grossTonnage)];
  const days = Math.max(0, berthHours) / 24;
  return crew * config.portCallCost.crewDailyWageUsd * days;
}

/** 냉동컨테이너 전력비 — 냉동선(reefer)에만 적용. GT→TEU 근사 × 시간당 전력단가 × 정박시간. */
export function computeReeferPowerCostUsd(vesselType: string | undefined, grossTonnage: number, berthHours: number, config: PortConfig): number {
  if (normalizeVesselType(vesselType) !== "reefer") return 0;
  const { reeferTeuPerGrossTonnage, reeferPowerUsdPerTeuPerHour } = config.portCallCost;
  const reeferTeu = grossTonnage * reeferTeuPerGrossTonnage;
  return reeferTeu * reeferPowerUsdPerTeuPerHour * Math.max(0, berthHours);
}

export interface PortCallCostInput {
  vesselType?: string; // 선종명(Port-MIS vsslKndNm)
  grossTonnage: number; // 총톤수
  crewCount?: number; // 실측 승무원수(없으면 규모별 대체값)
  distanceNm?: number; // 항해 구간 거리(해리). 없으면 항해 연료비는 생략(정박 중심 계산).
  speedKn?: number; // 항해 선속. distanceNm이 있을 때만 사용(기본 12kn).
  berthHours?: number; // 정박(하역+대기) 총 시간. 기본은 항만 평균 재항시간(dwellMedianHours).
  waitingHours?: number; // berthHours 중 "대기(체선)"로 볼 시간. 기본 0(전부 정상 하역으로 봄).
  year?: number; // CII 등급 산정 연도(carbon-port-due.ts로 위임, 기본 현재 연도)
}

export interface PortCallCostBreakdown {
  grossTonnage: number;
  berthHours: number;
  voyageFuel: FuelCostLeg | null; // distanceNm 없으면 null
  hotelingFuel: FuelCostLeg;
  portDue: CarbonPortDue; // 표준 입항료 + 탄소부담금 + CII 등급 차등(전체 내역 포함)
  tugFeeUsd: number;
  waitingCostUsd: number;
  crewLaborCostUsd: number;
  reeferPowerCostUsd: number;
  totalUsd: number;
  note: string;
}

/** 입항 1건의 비용 항목을 전부 계산해 합산한다. 각 항목은 위 개별 함수들의 조합이다. */
export function computePortCallCost(input: PortCallCostInput, config: PortConfig): PortCallCostBreakdown {
  const grossTonnage = Math.max(0, input.grossTonnage);
  const berthHours = input.berthHours ?? config.portCallCapacity.dwellMedianHours;
  const waitingHours = Math.min(input.waitingHours ?? 0, berthHours);

  const voyageFuel: FuelCostLeg | null =
    input.distanceNm != null && input.distanceNm > 0
      ? (() => {
          const speedKn = input.speedKn ?? 12;
          const tonnage = voyageFuelTon(input.vesselType, grossTonnage, input.distanceNm!, speedKn);
          const fuelType = hotelingFuelRate(input.vesselType, grossTonnage).fuelType === "LNG" ? "LNG" : "VLSFO"; // 항해 중 연료종류
          return { tonnage: round(tonnage, 2), fuelType, costUsd: round(tonnage * FUEL_PRICE_USD_PER_TON[fuelType]) };
        })()
      : null;

  const hotel = hotelingFuelRate(input.vesselType, grossTonnage);
  const hotelTonnage = hotel.ratePerHourTon * berthHours;
  const hotelingFuel: FuelCostLeg = {
    tonnage: round(hotelTonnage, 2),
    fuelType: hotel.fuelType,
    costUsd: round(hotelTonnage * FUEL_PRICE_USD_PER_TON[hotel.fuelType]),
  };

  const portDue = computeCarbonPortDue({ vesselType: input.vesselType, grossTonnage, berthHours, year: input.year }, config);
  const tugFeeUsd = round(computeTugFeeUsd(grossTonnage, config));
  const waitingCostUsd = round(computeWaitingCostUsd(waitingHours, grossTonnage, config));
  const crewLaborCostUsd = round(computeCrewLaborCostUsd(berthHours, grossTonnage, config, input.crewCount));
  const reeferPowerCostUsd = round(computeReeferPowerCostUsd(input.vesselType, grossTonnage, berthHours, config));

  const totalUsd = round(
    (voyageFuel?.costUsd ?? 0) +
      hotelingFuel.costUsd +
      portDue.totalDueUsd +
      tugFeeUsd +
      waitingCostUsd +
      crewLaborCostUsd +
      reeferPowerCostUsd
  );

  const note = `입항료 $${portDue.totalDueUsd.toLocaleString("en-US")}(${portDue.note}) · 예선료 $${tugFeeUsd.toLocaleString(
    "en-US"
  )} · 정박연료 $${hotelingFuel.costUsd.toLocaleString("en-US")}${
    waitingHours > 0 ? ` · 대기비용 $${waitingCostUsd.toLocaleString("en-US")}` : ""
  }${reeferPowerCostUsd > 0 ? ` · 냉동전력 $${reeferPowerCostUsd.toLocaleString("en-US")}` : ""}`;

  return {
    grossTonnage,
    berthHours: round(berthHours, 1),
    voyageFuel,
    hotelingFuel,
    portDue,
    tugFeeUsd,
    waitingCostUsd,
    crewLaborCostUsd,
    reeferPowerCostUsd,
    totalUsd,
    note,
  };
}
