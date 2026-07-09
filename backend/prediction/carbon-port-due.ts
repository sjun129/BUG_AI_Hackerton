// 환경차등 입항료(탄소비용) 계산 — ML 없이 결정론적. 탄소 배출량에 따라 입항세가 어떻게
// 바뀌는지(= 탄소비용)를 산출한다.
//
// 실제 그린포트/ESI 제도처럼 두 가지 탄소 메커니즘을 합친다:
//   1) 탄소부담금(levy): 이번 입항(정박 hoteling) 중 배출하는 CO2에 단가를 매긴다(항상 ≥0).
//   2) CII 등급 차등(bonus/malus): 청정선(A·B)은 표준 입항료를 할인, 저효율선(D·E)은 할증.
//
//   입항세 변화(carbonCost) = 탄소부담금 + 등급차등
//   최종 입항료(totalDue)   = 표준 입항료(baseDue) + 입항세 변화
//
// 배출량은 fuel.ts(정박 연료→CO2), 등급은 cii.ts(A~E)를 재사용한다.
// 요율·탄소가격·등급 차등율은 항만 정책이라 seed-port.ts(portDue)에서 온다(데이터/코드 분리).

import type { PortConfig } from "../ports/port-types";
import { CO2_FACTOR_TON, hotelingFuelRate } from "./fuel";
import { computeCiiStatus, type CiiGrade } from "./cii";

export interface CarbonPortDueInput {
  vesselType?: string; // 선종명(Port-MIS vsslKndNm) — 연료·CII 분류에 사용
  grossTonnage: number; // 총톤수
  berthHours?: number; // 정박(hoteling) 시간. 기본은 항만 평균 재항시간(dwellMedianHours)
  year?: number; // CII 등급 산정 연도(기본 현재 연도)
}

export interface CarbonPortDue {
  grossTonnage: number;
  baseDueUsd: number; // 표준 입항료(GT 기반)
  berthHours: number; // 배출 산정에 쓴 정박 시간
  portCallCo2Ton: number; // 이번 입항에서 배출하는 CO2(정박 hoteling)
  carbonPriceUsdPerTon: number;
  carbonLevyUsd: number; // 탄소부담금(배출 CO2 × 단가, ≥0)
  ciiGrade: CiiGrade | null; // 환경등급(선종 미분류·GT 미상이면 null)
  gradeAdjustmentUsd: number; // 등급 차등액(− 할인 / + 할증)
  carbonCostUsd: number; // 입항세 변화 = levy + gradeAdjustment
  totalDueUsd: number; // 최종 입항료 = base + carbonCost
  changePct: number; // 표준 대비 변화율(%)
  note: string;
}

function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/**
 * 선박(선종·총톤수)에 대해 탄소 배출 기반 입항료 변화를 계산한다.
 * baseDue(GT) 위에 탄소부담금과 CII 등급 차등을 얹어 최종 입항료를 만든다.
 */
export function computeCarbonPortDue(input: CarbonPortDueInput, config: PortConfig): CarbonPortDue {
  const policy = config.portDue;
  const gt = Math.max(0, input.grossTonnage);
  const berthHours = input.berthHours ?? config.portCallCapacity.dwellMedianHours;
  const year = input.year ?? new Date().getFullYear();

  const baseDueUsd = gt * policy.ratePerGtUsd;

  // 정박 중 배출 CO2 = 시간당 정박연료(t/h) × 정박시간 × 연료별 CO2 계수.
  const hotel = hotelingFuelRate(input.vesselType, gt);
  const fuelTon = hotel.ratePerHourTon * Math.max(0, berthHours);
  const portCallCo2Ton = fuelTon * CO2_FACTOR_TON[hotel.fuelType];
  const carbonLevyUsd = portCallCo2Ton * policy.carbonPriceUsdPerTon;

  // CII 등급 차등 — 등급을 못 구하면(other 선종/ GT 미상) 차등 없음(C 취급).
  const cii = computeCiiStatus(input.vesselType, gt, year);
  const ciiGrade = cii?.grade ?? null;
  const gradeMultiplier = ciiGrade ? policy.gradeMultiplier[ciiGrade] : 0;
  const gradeAdjustmentUsd = baseDueUsd * gradeMultiplier;

  const carbonCostUsd = carbonLevyUsd + gradeAdjustmentUsd;
  const totalDueUsd = baseDueUsd + carbonCostUsd;
  const changePct = baseDueUsd > 0 ? (carbonCostUsd / baseDueUsd) * 100 : 0;

  const gradeText = ciiGrade
    ? `CII ${ciiGrade}등급 ${gradeMultiplier >= 0 ? "+" : ""}${round(gradeMultiplier * 100, 1)}%`
    : "CII 등급 미상(차등 없음)";
  const note = `${gradeText} · 탄소부담금 $${round(carbonLevyUsd).toLocaleString("en-US")} (CO₂ ${round(
    portCallCo2Ton,
    1
  )}t)`;

  return {
    grossTonnage: gt,
    baseDueUsd: round(baseDueUsd),
    berthHours: round(berthHours, 1),
    portCallCo2Ton: round(portCallCo2Ton, 2),
    carbonPriceUsdPerTon: policy.carbonPriceUsdPerTon,
    carbonLevyUsd: round(carbonLevyUsd),
    ciiGrade,
    gradeAdjustmentUsd: round(gradeAdjustmentUsd),
    carbonCostUsd: round(carbonCostUsd),
    totalDueUsd: round(totalDueUsd),
    changePct: round(changePct, 1),
    note,
  };
}
