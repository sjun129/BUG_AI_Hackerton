import {
  generateRouteScenarioAdvisor,
  type RouteScenarioAdvisorResult,
} from "@/backend/advisor/route-scenario-advisor";
import { resolveRegionalCongestion } from "@/backend/congestion/regional-congestion";
import { computeCongestionForecast } from "@/backend/prediction/congestion";
import {
  computeAiRoutePolylineForShip,
  computeRouteScenarioRecommendations,
  type RoutePolyline,
  type RouteScenarioComputationResult,
  type RouteScenarioShipResult,
} from "@/backend/prediction/routes/route-recommendation";
import {
  normalizeSimulatedShipsForDecision,
  type SimulationValidation,
} from "@/backend/prediction/simulation-energy";
import type { EnergyDecisionShipInput } from "@/backend/prediction/energy-decision";
import { fetchPortCongestion } from "@/backend/portmis/congestion-source";
import { fetchPortCalls } from "@/backend/portmis/portcall-source";
import { BUSAN_PORT } from "@/backend/ports/seed-port";
import type { EnergyDecisionCongestionMode } from "@/backend/prediction/energy-decision";
import type { LatLon } from "@/backend/ports/port-types";
import { fetchSeaRiskAssessment } from "@/backend/marine/sea-risk-source";
import { fetchActiveTyphoons } from "@/backend/marine/typhoon";
import { computeSeaRisk, type SeaRiskAssessment } from "@/backend/prediction/sea-risk";
import type { TyphoonInfo } from "@/backend/marine/types";

export interface RouteScenarioRequest {
  mode?: unknown;
  congestionMode?: unknown;
  scenarioShips?: unknown;
  climateOverride?: unknown;
}

export interface AdvisedRouteScenarioShipResult extends RouteScenarioShipResult {
  advisor: RouteScenarioAdvisorResult;
  // 가상 기후 시나리오가 켜졌을 때만 채워진다 — "실측 데이터라면 이랬을" AI 경로(비교용).
  // 지도에서 적용 전/후를 나란히 보여주기 위한 필드로, 점수·연료 계산에는 쓰이지 않는다.
  baselineAiRoutePolyline?: RoutePolyline | null;
}

export interface RouteScenarioServiceResult extends Omit<RouteScenarioComputationResult, "results"> {
  advisorSource: RouteScenarioAdvisorResult["source"];
  results: AdvisedRouteScenarioShipResult[];
  isFallback: boolean;
  dataSources: string[];
  climateOverrideActive: boolean;
  // 가상 시나리오가 활성일 때 실제로 계산에 쓰인 값 — 프론트가 "적용됨"을 눈으로 확인할 수 있게 그대로 되돌려준다.
  climateOverrideInputs?: { waveHeightM?: number; windSpeedMs?: number; typhoonDistanceKm?: number };
  climateOverrideTyphoon?: { lat: number; lon: number } | null;
  validation: SimulationValidation;
  invalidShips?: SimulationValidation["issues"];
}

function normalizeCongestionMode(value: unknown): EnergyDecisionCongestionMode {
  return value === "eta-forecast" ? "eta-forecast" : "dashboard-current";
}

// AI 계산 경로가 회피할 활성 태풍 목록. API 미설정/오류는 "태풍 없음"으로 안전하게 처리한다
// (이 값이 없어도 나머지 경로 추천 전체가 실패해선 안 된다).
async function fetchActiveTyphoonsSafely() {
  try {
    return (await fetchActiveTyphoons()) ?? [];
  } catch (err) {
    console.warn("[route-scenarios] 태풍정보 조회 실패, 태풍 없음으로 처리:", err);
    return [];
  }
}

// ── 가상 기후 시나리오(/simulation 슬라이더) ──
// 실측 API 대신, 사용자가 UI에서 지정한 파고·풍속·(선택)가상 태풍 거리로 seaRisk를 계산한다.
// 가상 태풍은 위경도가 필요한데(AI 경로 회피 대상), UI는 "거리"만 받으므로 좌표를 역산해야
// 한다. ⚠️ 부산항 "중심점" 기준 고정 방위를 썼더니, 시뮬레이션 선박이 그 방위 밖에 있으면
// (예: 신항처럼 서쪽 목적지, 또는 선박이 중심점보다 남쪽에 있는 경우) 거리를 아무리 좁혀도
// 태풍이 실제 항로와 절대 안 겹쳐 AI 경로가 하나도 안 휘는 문제를 실측으로 확인했다.
// 그래서 "대표 선박(첫 번째 선박) → 목적지" 방위선 위, 선박에서 지정 거리만큼 뗀 지점에
// 놓는다 — 선박의 실제 진행 방향 위에 두는 것이라 항상 그 항로와 겹치게 된다.
interface ClimateOverrideInput {
  enabled: boolean;
  waveHeightM?: number;
  windSpeedMs?: number;
  typhoonDistanceKm?: number;
}

const SIM_TYPHOON_FALLBACK_BEARING_DEG = 180; // 대표 선박이 없을 때만 쓰는 폴백(정남쪽)

function clampNumber(value: unknown, min: number, max: number): number | undefined {
  const num = Number(value);
  if (!Number.isFinite(num)) return undefined;
  return Math.min(max, Math.max(min, num));
}

function normalizeClimateOverride(value: unknown): ClimateOverrideInput | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (v.enabled !== true) return null;
  return {
    enabled: true,
    waveHeightM: clampNumber(v.waveHeightM, 0, 15),
    windSpeedMs: clampNumber(v.windSpeedMs, 0, 60),
    typhoonDistanceKm: v.typhoonDistanceKm != null ? clampNumber(v.typhoonDistanceKm, 0, 500) : undefined,
  };
}

/** 기준점에서 방위각(deg)·거리(km)만큼 떨어진 좌표(대원 항법 공식, 결정론적 기하 계산). */
function destinationPoint(origin: LatLon, bearingDeg: number, distanceKm: number): LatLon {
  const earthRadiusKm = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const lat1 = toRad(origin.lat);
  const lon1 = toRad(origin.lon);
  const brng = toRad(bearingDeg);
  const angularDist = distanceKm / earthRadiusKm;

  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(angularDist) + Math.cos(lat1) * Math.sin(angularDist) * Math.cos(brng));
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(angularDist) * Math.cos(lat1),
      Math.cos(angularDist) - Math.sin(lat1) * Math.sin(lat2)
    );

  return { lat: toDeg(lat2), lon: toDeg(lon2) };
}

/** from → to 방위각(deg, 정북=0, 시계방향). */
function bearingBetween(from: LatLon, to: LatLon): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const dLon = toRad(to.lon - from.lon);
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** 대표 선박(있으면) → 목적지 방위선 위에 가상 태풍을 놓는다. 없으면 항 남쪽에 놓는다(폴백). */
function buildSimulatedTyphoon(distanceKm: number, referenceShip?: EnergyDecisionShipInput): TyphoonInfo {
  let anchor: LatLon = BUSAN_PORT.center;
  let bearingDeg = SIM_TYPHOON_FALLBACK_BEARING_DEG;
  if (referenceShip) {
    anchor = { lat: referenceShip.lat, lon: referenceShip.lon };
    const destination =
      BUSAN_PORT.simulationDestinations.find((d) => d.id === referenceShip.destinationPortId) ??
      BUSAN_PORT.simulationDestinations[0];
    if (destination) bearingDeg = bearingBetween(anchor, destination.center);
  }
  const position = destinationPoint(anchor, bearingDeg, distanceKm);
  return {
    typhoonId: "SIM-CLIMATE-OVERRIDE",
    name: "SIMULATED",
    nameKr: "가상 시나리오 태풍",
    status: "발생",
    track: [{ time: new Date().toISOString(), lat: position.lat, lon: position.lon, forecast: false }],
    source: "simulation-climate-override",
  };
}

async function resolveSeaRiskAndTyphoons(
  climateOverride: ClimateOverrideInput | null,
  referenceShip?: EnergyDecisionShipInput
): Promise<{
  seaRisk: SeaRiskAssessment;
  typhoons: TyphoonInfo[];
  simulatedTyphoonPosition: LatLon | null;
  // 가상 시나리오일 때만 채워진다 — 지도에 "실측 기준이었다면" 비교선을 그리는 데 쓴다.
  baselineTyphoons: TyphoonInfo[] | null;
}> {
  if (climateOverride) {
    const simulatedTyphoon =
      climateOverride.typhoonDistanceKm != null ? buildSimulatedTyphoon(climateOverride.typhoonDistanceKm, referenceShip) : null;
    const simulatedTyphoonPosition = simulatedTyphoon
      ? { lat: simulatedTyphoon.track[0].lat, lon: simulatedTyphoon.track[0].lon }
      : null;
    const seaRisk = computeSeaRisk({
      waveHeightM: climateOverride.waveHeightM,
      windSpeedMs: climateOverride.windSpeedMs,
      typhoonDistanceKm: climateOverride.typhoonDistanceKm,
    });
    const baselineTyphoons = await fetchActiveTyphoonsSafely();
    return { seaRisk, typhoons: simulatedTyphoon ? [simulatedTyphoon] : [], simulatedTyphoonPosition, baselineTyphoons };
  }

  const [seaRisk, typhoons] = await Promise.all([fetchSeaRiskAssessment(), fetchActiveTyphoonsSafely()]);
  return { seaRisk, typhoons, simulatedTyphoonPosition: null, baselineTyphoons: null };
}

export async function getRouteScenarios(input: RouteScenarioRequest): Promise<RouteScenarioServiceResult> {
  const climateOverride = normalizeClimateOverride(input.climateOverride);
  // 가상 태풍 위치를 "대표 선박 → 목적지" 방위선 위에 두려면 seaRisk/태풍 조회보다 선박 정규화가 먼저 필요하다.
  const { ships, validation } = normalizeSimulatedShipsForDecision(input.scenarioShips ?? [], BUSAN_PORT);
  const [portCalls, portMisCongestion, regionalCongestion, { seaRisk, typhoons, simulatedTyphoonPosition, baselineTyphoons }] =
    await Promise.all([
      fetchPortCalls(),
      fetchPortCongestion(),
      resolveRegionalCongestion(BUSAN_PORT),
      resolveSeaRiskAndTyphoons(climateOverride, ships[0]),
    ]);
  const congestion = portMisCongestion ?? computeCongestionForecast([], BUSAN_PORT);
  const result = computeRouteScenarioRecommendations({
    ships,
    congestion,
    portCalls,
    regionalCongestion,
    portConfig: BUSAN_PORT,
    congestionMode: normalizeCongestionMode(input.congestionMode),
    seaRisk,
    typhoons,
  });
  // 가상 시나리오일 때만: "실측 태풍 기준이었다면" AI 경로가 어떤 모양이었을지 비교용으로 미리 계산해둔다.
  const baselineAiRouteByShip =
    baselineTyphoons &&
    new Map(
      ships.map((ship) => [
        ship.id ?? ship.name,
        computeAiRoutePolylineForShip({ ship, portConfig: BUSAN_PORT, typhoons: baselineTyphoons }),
      ])
    );
  const results = await Promise.all(
    result.results.map(async (shipResult) => ({
      ...shipResult,
      advisor: await generateRouteScenarioAdvisor(shipResult),
      ...(baselineAiRouteByShip
        ? { baselineAiRoutePolyline: baselineAiRouteByShip.get(shipResult.shipId ?? shipResult.shipName) ?? null }
        : {}),
    }))
  );
  const advisorSource: RouteScenarioAdvisorResult["source"] = results.some((item) => item.advisor.source === "openai")
    ? "openai"
    : "rule-based-fallback";

  console.info("[route-scenarios:simulation]", {
    acceptedCount: validation.acceptedCount,
    rejectedCount: validation.rejectedCount,
    shipCount: result.summary.shipCount,
    recommendedCount: result.summary.recommendedCount,
    advisorSource,
    climateOverrideActive: Boolean(climateOverride),
  });

  return {
    ...result,
    advisorSource,
    results,
    isFallback: !portMisCongestion,
    climateOverrideActive: Boolean(climateOverride),
    ...(climateOverride
      ? {
          climateOverrideInputs: {
            waveHeightM: climateOverride.waveHeightM,
            windSpeedMs: climateOverride.windSpeedMs,
            typhoonDistanceKm: climateOverride.typhoonDistanceKm,
          },
          climateOverrideTyphoon: simulatedTyphoonPosition,
        }
      : {}),
    dataSources: [
      "scenario-ships",
      portMisCongestion ? "port-mis-congestion" : "congestion-fallback",
      "regional-port-congestion",
      "energy-baseline-data",
      "mof-guideline-route",
      climateOverride
        ? "simulation-climate-override"
        : seaRisk.dataAvailable
          ? "marine-sea-risk"
          : "sea-risk-unavailable",
      typhoons.length > 0 ? "active-typhoon-avoidance" : "no-active-typhoon",
    ],
    validation,
    ...(validation.issues.length > 0 ? { invalidShips: validation.issues } : {}),
  };
}
