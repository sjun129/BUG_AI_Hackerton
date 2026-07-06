import type { CongestionForecast, CongestionPoint, PortCall, PortConfig, Ship } from "../ports/port-types";
import { BUSAN_PORT } from "../ports/seed-port";
import { haversineDistanceKm } from "./eta";
import {
  ENERGY_ESTIMATE_DISCLAIMER,
  estimateWaitingMinutesByCongestion,
  findVesselSpecByImo,
  findVesselSpecByMmsi,
  findVesselSpecByName,
  getFuelEmissionFactor,
  getWaitingFuelKgPerHour,
  inferFuelType,
  normalizeShipName,
  normalizeVesselType,
  type Confidence,
  type CongestionWaitingStatus,
  type NormalizedVesselType,
  type ShipSizeClass,
} from "../data/energy";

const KM_TO_NM = 1 / 1.852;
const MS_PER_HOUR = 60 * 60 * 1000;
const DEFAULT_MIN_SPEED_KN = 8;
const MIN_SOG_KN = 3;
const MIN_DISTANCE_NM = 10;
const MAX_DISTANCE_NM = 600;

export type CongestionBasis = "eta-forecast-bucket" | "current-level-fallback";
export type CurrentInPortBasis = "actual-port-calls" | "level-times-p99" | "unknown";

export interface ComputeEnergyDecisionsInput {
  ships: Ship[];
  congestion: CongestionForecast;
  portCalls?: PortCall[];
  portConfig?: PortConfig;
  now?: Date;
}

export interface EnergyDecision {
  shipId?: string;
  shipName: string;
  callSign?: string;
  mmsi?: string;
  imo?: string;

  status: "underway";
  distanceNm: number;
  currentSpeedKn: number;
  recommendedSpeedKn: number;
  idealJitSpeedKn: number;
  minSpeedApplied: boolean;

  currentEta: string;
  recommendedEta: string;

  currentCongestionLevel: number;
  currentCongestionStatus: CongestionWaitingStatus;
  recommendedCongestionLevel: number;
  recommendedCongestionStatus: CongestionWaitingStatus;
  congestionBasis: CongestionBasis;

  currentWaitingMinutes: number;
  optimizedWaitingMinutes: number;
  reducedWaitingMinutes: number;
  absorbedWaitMinutes: number;
  residualWaitMinutes: number;

  grossTonnage?: number;
  vesselType?: string;
  normalizedVesselType: NormalizedVesselType;
  sizeClass: ShipSizeClass;

  fuelType: string;
  fuelNameKo: string;
  fuelTypeInferred: boolean;
  fuelTypeReason: string;
  fuelConsumptionKgPerHour: number;
  estimatedFuelSavedKg: number;
  co2Factor: number;
  estimatedCo2ReducedKg: number;

  currentInPort?: number;
  currentInPortBasis: CurrentInPortBasis;

  confidence: Confidence;
  reasons: string[];
  calculationBasis: string[];
}

export interface EnergyDecisionSummary {
  candidateCount: number;
  recommendedCount: number;
  totalReducedWaitingMinutes: number;
  totalEstimatedFuelSavedKg: number;
  totalEstimatedCo2ReducedKg: number;
}

export interface EnergyDecisionResult {
  source: "deterministic-jit";
  isFallback: boolean;
  basis: "jit-arrival-energy-decision";
  lastUpdated: string;
  dataSources: string[];
  decisions: EnergyDecision[];
  summary: EnergyDecisionSummary;
  calculationNote: string;
}

interface EnrichedShip {
  vesselType?: string;
  grossTonnage?: number;
  imo?: string;
  callSign?: string;
  sizeClass: ShipSizeClass;
  normalizedVesselType: NormalizedVesselType;
  matchBasis: string;
}

function round(n: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * MS_PER_HOUR);
}

function bucketStart(date: Date): string {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

function findForecastBucket(forecast: CongestionPoint[], eta: Date): CongestionPoint | undefined {
  const etaTime = eta.getTime();
  return forecast.find((point) => {
    const start = new Date(point.time).getTime();
    return etaTime >= start && etaTime < start + MS_PER_HOUR;
  });
}

function levelStatus(level: number): CongestionWaitingStatus {
  return estimateWaitingMinutesByCongestion(level).status;
}

function findPortCall(ship: Ship, portCalls: PortCall[]): PortCall | undefined {
  const shipCallSign = ship.callSign?.trim().toUpperCase();
  if (shipCallSign) {
    const byCallSign = portCalls.find((call) => call.callSign?.trim().toUpperCase() === shipCallSign);
    if (byCallSign) return byCallSign;
  }

  const shipName = normalizeShipName(ship.name);
  if (!shipName) return undefined;
  return portCalls.find((call) => normalizeShipName(call.vesselName) === shipName);
}

function enrichShip(ship: Ship, portCalls: PortCall[]): EnrichedShip {
  const spec =
    findVesselSpecByMmsi(ship.mmsi) ??
    findVesselSpecByImo(ship.imo) ??
    findVesselSpecByName(ship.name);
  const portCall = findPortCall(ship, portCalls);
  const vesselType = portCall?.vesselType ?? spec?.vesselType;
  const grossTonnage = ship.grossTonnage ?? portCall?.grossTonnage ?? spec?.grossTonnage;
  const normalizedVesselType = normalizeVesselType(vesselType);
  const waitingFuel = getWaitingFuelKgPerHour({ grossTonnage, vesselType });

  let matchBasis = "ais-only";
  if (spec?.mmsi && spec.mmsi === ship.mmsi) matchBasis = "mmsi";
  else if (ship.imo && spec?.imo === ship.imo) matchBasis = "imo";
  else if (portCall?.callSign && ship.callSign && portCall.callSign.trim().toUpperCase() === ship.callSign.trim().toUpperCase()) {
    matchBasis = "call-sign";
  } else if (spec || portCall) {
    matchBasis = "ship-name";
  }

  return {
    ...(vesselType ? { vesselType } : {}),
    ...(grossTonnage != null ? { grossTonnage } : {}),
    ...(ship.imo ?? spec?.imo ? { imo: ship.imo ?? spec?.imo } : {}),
    ...(ship.callSign ?? portCall?.callSign ? { callSign: ship.callSign ?? portCall?.callSign } : {}),
    sizeClass: waitingFuel.sizeClass,
    normalizedVesselType,
    matchBasis,
  };
}

function currentInPort(
  congestion: CongestionForecast,
  portCalls: PortCall[],
  portConfig: PortConfig
): { count?: number; basis: CurrentInPortBasis } {
  if (portCalls.length > 0) return { count: portCalls.length, basis: "actual-port-calls" };
  if (Number.isFinite(congestion.currentLevel)) {
    return {
      count: Math.round(Math.max(0, congestion.currentLevel) * portConfig.portCallCapacity.portWide.p99),
      basis: "level-times-p99",
    };
  }
  return { basis: "unknown" };
}

function confidence(params: {
  congestionBasis: CongestionBasis;
  grossTonnage?: number;
  vesselType?: string;
  fuelConfidence: Confidence;
  currentInPortBasis: CurrentInPortBasis;
}): Confidence {
  let score = 0;
  if (params.congestionBasis === "eta-forecast-bucket") score += 2;
  if (params.grossTonnage != null) score += 1;
  if (params.vesselType) score += 1;
  if (params.fuelConfidence === "high") score += 2;
  else if (params.fuelConfidence === "medium") score += 1;
  if (params.currentInPortBasis === "actual-port-calls") score += 1;

  if (score >= 5) return "high";
  if (score >= 3) return "medium";
  return "low";
}

export function computeEnergyDecisions(input: ComputeEnergyDecisionsInput): EnergyDecisionResult {
  const portConfig = input.portConfig ?? BUSAN_PORT;
  const now = input.now ?? new Date();
  const portCalls = input.portCalls ?? [];
  const inPort = currentInPort(input.congestion, portCalls, portConfig);
  const decisions: EnergyDecision[] = [];
  let candidateCount = 0;

  for (const ship of input.ships) {
    if (ship.status !== "underway" || ship.sog < MIN_SOG_KN) continue;

    const distanceNm = haversineDistanceKm({ lat: ship.lat, lon: ship.lon }, portConfig.center) * KM_TO_NM;
    if (distanceNm < MIN_DISTANCE_NM || distanceNm > MAX_DISTANCE_NM) continue;
    candidateCount += 1;

    const currentSpeedKn = Math.max(0.1, ship.sog);
    const currentTravelHours = distanceNm / currentSpeedKn;
    const currentEtaDate = addHours(now, currentTravelHours);
    const currentBucket = findForecastBucket(input.congestion.forecast, currentEtaDate);
    const congestionBasis: CongestionBasis = currentBucket ? "eta-forecast-bucket" : "current-level-fallback";
    const currentCongestionLevel = currentBucket?.level ?? input.congestion.currentLevel ?? 0;
    const currentWait = estimateWaitingMinutesByCongestion(currentCongestionLevel);

    if (currentWait.status === "원활" || currentWait.waitingMinutes <= 0) continue;

    const waitHours = currentWait.waitingMinutes / 60;
    const idealJitSpeedKn = distanceNm / (currentTravelHours + waitHours);
    const minSpeedApplied = idealJitSpeedKn < DEFAULT_MIN_SPEED_KN;
    const recommendedSpeedKn = Math.min(currentSpeedKn, Math.max(DEFAULT_MIN_SPEED_KN, idealJitSpeedKn));
    if (recommendedSpeedKn >= currentSpeedKn) continue;

    const recommendedTravelHours = distanceNm / recommendedSpeedKn;
    const absorbedWaitMinutes = Math.min(currentWait.waitingMinutes, Math.max(0, (recommendedTravelHours - currentTravelHours) * 60));
    const residualWaitMinutes = Math.max(0, currentWait.waitingMinutes - absorbedWaitMinutes);
    const reducedWaitingMinutes = Math.max(0, currentWait.waitingMinutes - residualWaitMinutes);
    if (reducedWaitingMinutes <= 0) continue;

    const recommendedEtaDate = addHours(now, recommendedTravelHours);
    const recommendedBucket = findForecastBucket(input.congestion.forecast, recommendedEtaDate);
    const recommendedCongestionLevel = recommendedBucket?.level ?? currentCongestionLevel;
    const recommendedCongestionStatus = levelStatus(recommendedCongestionLevel);

    const enriched = enrichShip(ship, portCalls);
    const waitingFuel = getWaitingFuelKgPerHour({
      grossTonnage: enriched.grossTonnage,
      vesselType: enriched.vesselType,
    });
    const fuelInference = inferFuelType({
      vesselType: enriched.vesselType,
      grossTonnage: enriched.grossTonnage,
    });
    const fuelFactor = getFuelEmissionFactor(fuelInference.fuelType);
    const estimatedFuelSavedKg = (reducedWaitingMinutes / 60) * waitingFuel.kgPerHour;
    const estimatedCo2ReducedKg = estimatedFuelSavedKg * fuelFactor.cfTco2PerTon;
    if (estimatedFuelSavedKg <= 0 || estimatedCo2ReducedKg <= 0) continue;

    const reasons = [
      congestionBasis === "eta-forecast-bucket"
        ? `ETA 시간대 forecast bucket(${bucketStart(currentEtaDate)}) 혼잡도 ${round(currentCongestionLevel, 2)} 사용`
        : `ETA 시간대 forecast bucket 없음, currentLevel ${round(currentCongestionLevel, 2)} 사용`,
      `JIT 속도 ${round(recommendedSpeedKn, 1)}kn로 ${Math.round(reducedWaitingMinutes)}분 대기 흡수`,
      `선박 제원 매칭 기준: ${enriched.matchBasis}`,
      fuelInference.reason,
    ];

    const calculationBasis = [
      "JIT 정시도착: v = distanceNm / (distanceNm / currentSpeedKn + waitingHours)",
      "ETA가 포함된 Port-MIS congestion forecast bucket 우선 사용",
      "대기 연료 소모율: backend/data/energy getWaitingFuelKgPerHour()",
      "CO2 감축량 kg = 절감 연료 kg * cfTco2PerTon",
    ];

    decisions.push({
      shipId: ship.mmsi,
      shipName: ship.name,
      ...(enriched.callSign ? { callSign: enriched.callSign } : {}),
      mmsi: ship.mmsi,
      ...(enriched.imo ? { imo: enriched.imo } : {}),
      status: "underway",
      distanceNm: round(distanceNm, 1),
      currentSpeedKn: round(currentSpeedKn, 1),
      recommendedSpeedKn: round(recommendedSpeedKn, 1),
      idealJitSpeedKn: round(idealJitSpeedKn, 1),
      minSpeedApplied,
      currentEta: currentEtaDate.toISOString(),
      recommendedEta: recommendedEtaDate.toISOString(),
      currentCongestionLevel: round(currentCongestionLevel, 3),
      currentCongestionStatus: currentWait.status,
      recommendedCongestionLevel: round(recommendedCongestionLevel, 3),
      recommendedCongestionStatus,
      congestionBasis,
      currentWaitingMinutes: Math.round(currentWait.waitingMinutes),
      optimizedWaitingMinutes: Math.round(residualWaitMinutes),
      reducedWaitingMinutes: Math.round(reducedWaitingMinutes),
      absorbedWaitMinutes: Math.round(absorbedWaitMinutes),
      residualWaitMinutes: Math.round(residualWaitMinutes),
      ...(enriched.grossTonnage != null ? { grossTonnage: enriched.grossTonnage } : {}),
      ...(enriched.vesselType ? { vesselType: enriched.vesselType } : {}),
      normalizedVesselType: enriched.normalizedVesselType,
      sizeClass: enriched.sizeClass,
      fuelType: fuelFactor.fuelType,
      fuelNameKo: fuelFactor.fuelNameKo,
      fuelTypeInferred: true,
      fuelTypeReason: fuelInference.reason,
      fuelConsumptionKgPerHour: Math.round(waitingFuel.kgPerHour),
      estimatedFuelSavedKg: Math.round(estimatedFuelSavedKg),
      co2Factor: fuelFactor.cfTco2PerTon,
      estimatedCo2ReducedKg: Math.round(estimatedCo2ReducedKg),
      ...(inPort.count != null ? { currentInPort: inPort.count } : {}),
      currentInPortBasis: inPort.basis,
      confidence: confidence({
        congestionBasis,
        grossTonnage: enriched.grossTonnage,
        vesselType: enriched.vesselType,
        fuelConfidence: fuelInference.confidence,
        currentInPortBasis: inPort.basis,
      }),
      reasons,
      calculationBasis,
    });
  }

  decisions.sort((a, b) => b.estimatedCo2ReducedKg - a.estimatedCo2ReducedKg);

  const summary = decisions.reduce<EnergyDecisionSummary>(
    (acc, decision) => ({
      candidateCount: acc.candidateCount,
      recommendedCount: acc.recommendedCount + 1,
      totalReducedWaitingMinutes: acc.totalReducedWaitingMinutes + decision.reducedWaitingMinutes,
      totalEstimatedFuelSavedKg: acc.totalEstimatedFuelSavedKg + decision.estimatedFuelSavedKg,
      totalEstimatedCo2ReducedKg: acc.totalEstimatedCo2ReducedKg + decision.estimatedCo2ReducedKg,
    }),
    {
      candidateCount,
      recommendedCount: 0,
      totalReducedWaitingMinutes: 0,
      totalEstimatedFuelSavedKg: 0,
      totalEstimatedCo2ReducedKg: 0,
    }
  );

  return {
    source: "deterministic-jit",
    isFallback: input.congestion.source !== "port-mis",
    basis: "jit-arrival-energy-decision",
    lastUpdated: now.toISOString(),
    dataSources: [
      input.congestion.source === "port-mis" ? "port-mis-congestion" : "ais-congestion-fallback",
      "ais-supabase-ships",
      "port-mis-port-calls",
      "energy-baseline-data",
    ],
    decisions,
    summary,
    calculationNote: ENERGY_ESTIMATE_DISCLAIMER,
  };
}
