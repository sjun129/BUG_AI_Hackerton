import type { ScenarioShipSource } from "@/frontend/types/simulation";

export interface RouteScenario {
  routeId: string;
  routeName: string;
  routeShortName: string;
  routeSource: "manual-simulation-route";
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
  score: number;
  rank: number;
  isRecommended: boolean;
  reasons: string[];
  calculationBasis: string[];
  warnings: string[];
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
  routeScenarios: RouteScenario[];
  warnings: string[];
}

export interface RouteScenarioResponse {
  source: "deterministic-route-scenario";
  mode: "simulation";
  basis: "predefined-approach-route-comparison";
  lastUpdated: string;
  calculationNote: string;
  isFallback: boolean;
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
