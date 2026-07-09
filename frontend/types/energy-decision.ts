import type { ScenarioShipSource } from "@/frontend/types/simulation";

export type EnergyDecisionConfidence = "high" | "medium" | "low";

export interface EnergyDecision {
  shipId?: string;
  shipName: string;
  scenarioSource?: ScenarioShipSource;
  isScenario?: true;
  isSimulated?: true;
  originalShipId?: string;
  mmsi?: string;
  imo?: string;
  callSign?: string;
  snapshotAt?: string;
  destinationPortId?: string;
  destinationPortName?: string;
  distanceNm: number;
  currentSpeedKn: number;
  recommendedSpeedKn: number;
  currentEta: string;
  recommendedEta: string;
  currentCongestionLevel: number;
  currentCongestionStatus: string;
  recommendedCongestionStatus: string;
  congestionBasis: string;
  currentWaitingMinutes: number;
  optimizedWaitingMinutes: number;
  reducedWaitingMinutes: number;
  estimatedFuelSavedKg: number;
  estimatedCo2ReducedKg: number;
  confidence: EnergyDecisionConfidence;
  reasons?: string[];
}

export interface EnergyDecisionDestinationSummary {
  destinationPortId: string;
  destinationPortName: string;
  candidateCount: number;
  recommendedCount: number;
}

export interface EnergyDecisionSummary {
  candidateCount: number;
  recommendedCount: number;
  etaForecastMatchedCount: number;
  currentLevelFallbackCount: number;
  lowCongestionSkippedCount: number;
  totalReducedWaitingMinutes: number;
  totalEstimatedFuelSavedKg: number;
  totalEstimatedCo2ReducedKg: number;
  byDestination?: EnergyDecisionDestinationSummary[];
}

export interface EnergyDecisionApiResult {
  lastUpdated: string;
  destinationCongestion?: Record<string, { level: number; status: string }>;
  forecastFreshness: { isStale: boolean };
  decisions: EnergyDecision[];
  summary: EnergyDecisionSummary;
  emptyReason?: {
    title: string;
    description: string;
    suggestions?: string[];
  };
  calculationNote?: string;
  validation?: {
    rejectedCount: number;
  };
}

export type SimulationEnergyDecisionResult = EnergyDecisionApiResult;
