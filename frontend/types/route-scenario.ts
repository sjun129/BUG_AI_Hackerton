import type { ScenarioShipSource } from "@/frontend/types/simulation";

export interface RoutePolylinePoint {
  lat: number;
  lng: number;
  label?: string;
}

export interface RoutePolyline {
  routeId: string;
  routeName: string;
  points: RoutePolylinePoint[];
}

export interface RouteScenarioMapOverlay {
  shipId: string;
  routeId: string;
  routeName: string;
  routeSource: "manual-simulation-route" | "mof-guideline-route" | "ai-computed-route";
  isRecommended: boolean;
  points: RoutePolylinePoint[];
  distanceNm?: number;
  eta?: string;
  score?: number;
}

// 가상 기후 시나리오 적용 전(실측 기준) AI 경로 비교선 — 지도에서 적용 전/후를 한눈에 비교하는 용도.
export interface RouteScenarioBaselineOverlay {
  shipId: string;
  points: RoutePolylinePoint[];
}

export interface RouteScenarioAdvisorResult {
  source: "openai" | "rule-based-fallback";
  summary: string;
  recommendation: string;
  comparison: string[];
  reasons: string[];
  risks: string[];
  disclaimer: string;
}

export type SeaRiskGrade = "정보없음" | "낮음" | "보통" | "높음" | "위험";

export interface SeaRiskFactor {
  key: "wave" | "wind" | "typhoon" | "operationIndex";
  label: string;
  value: number;
  risk: number;
  detail: string;
}

export interface SeaRiskAssessment {
  level: number;
  grade: SeaRiskGrade;
  factors: SeaRiskFactor[];
  basis: string[];
  dataAvailable: boolean;
}

// /simulation 가상 기후 시나리오 슬라이더 입력. enabled=false 면 실측 데이터를 그대로 쓴다.
export interface ClimateOverrideInput {
  enabled: boolean;
  waveHeightM?: number; // 0~15m
  windSpeedMs?: number; // 0~60m/s
  typhoonDistanceKm?: number; // 0~500km, 미지정 시 가상 태풍 없음
}

export interface RouteScenario {
  routeId: string;
  routeName: string;
  routeShortName: string;
  routeSource: "manual-simulation-route" | "mof-guideline-route" | "ai-computed-route";
  destinationPortId: string;
  destinationPortName: string;
  distanceNm: number;
  currentSpeedKn: number;
  eta: string;
  congestionLevel: number;
  congestionStatus: string;
  congestionBasis: string;
  estimatedWaitingMinutes: number;
  recommendedSpeedKn: number;
  recommendedEta: string;
  reducedWaitingMinutes: number;
  estimatedFuelKg: number;
  estimatedCo2Kg: number;
  estimatedFuelSavedKg: number;
  estimatedCo2ReducedKg: number;
  seaRisk: SeaRiskAssessment;
  score: number;
  rank: number;
  isRecommended: boolean;
  reasons: string[];
  calculationBasis: string[];
  warnings: string[];
  routePolyline: RoutePolyline;
}

export interface RouteScenarioShipResult {
  shipId?: string;
  shipName: string;
  scenarioSource?: ScenarioShipSource;
  originalShipId?: string;
  mmsi?: string;
  imo?: string;
  callSign?: string;
  snapshotAt?: string;
  destinationPortId: string;
  destinationPortName: string;
  recommendedRouteId?: string;
  recommendedRouteName?: string;
  recommendedRouteShortName?: string;
  advisor?: RouteScenarioAdvisorResult;
  routeScenarios: RouteScenario[];
  warnings: string[];
  // 가상 기후 시나리오가 켜졌을 때만 존재 — "실측 데이터라면" AI 경로가 어땠을지 비교선.
  baselineAiRoutePolyline?: RoutePolyline | null;
}

export interface RouteScenarioResponse {
  source: "deterministic-route-scenario";
  advisorSource?: RouteScenarioAdvisorResult["source"];
  mode: "simulation";
  basis: "predefined-approach-route-comparison";
  lastUpdated: string;
  calculationNote: string;
  seaRisk: SeaRiskAssessment;
  isFallback: boolean;
  climateOverrideActive?: boolean;
  climateOverrideInputs?: { waveHeightM?: number; windSpeedMs?: number; typhoonDistanceKm?: number };
  climateOverrideTyphoon?: { lat: number; lon: number } | null;
  dataSources?: string[];
  results: RouteScenarioShipResult[];
  summary: {
    shipCount: number;
    recommendedCount: number;
  };
  validation?: {
    acceptedCount: number;
    rejectedCount: number;
    issues?: Array<{ index: number | "simulatedShips"; message: string }>;
  };
  invalidShips?: Array<{ index: number | "simulatedShips"; message: string }>;
}
