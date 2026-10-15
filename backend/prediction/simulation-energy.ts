import type { CongestionForecast, PortCall, PortConfig, RegionCongestionSeries, SimulationDestinationPortId } from "../ports/port-types";
import { BUSAN_PORT } from "../ports/seed-port";
import {
  computeEnergyDecisions,
  type EnergyDecisionCongestionMode,
  type EnergyDecisionResult,
  type EnergyDecisionShipInput,
  type ScenarioShipSource,
} from "./energy-decision";

const SIMULATED_VESSEL_TYPES = ["container", "bulk", "tanker", "lng", "generalCargo"] as const;

export type SimulatedVesselType = (typeof SIMULATED_VESSEL_TYPES)[number];

export interface SimulatedShipInput {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sog: number;
  status: "underway";
  vesselType?: SimulatedVesselType;
  grossTonnage?: number;
  destinationPortId?: SimulationDestinationPortId;
  source?: "simulation" | ScenarioShipSource;
  createdAt?: string;
  originalShipId?: string;
  mmsi?: string;
  imo?: string;
  callSign?: string;
  snapshotAt?: string;
}

export interface SimulationValidationIssue {
  index: number | "simulatedShips";
  message: string;
}

export interface SimulationValidation {
  acceptedCount: number;
  rejectedCount: number;
  issues: SimulationValidationIssue[];
}

export interface SimulationEnergyDecisionResult extends EnergyDecisionResult {
  mode: "simulation";
  basis:
    | "jit-arrival-simulation"
    | "jit-arrival-simulation-dashboard-current-congestion"
    | "jit-arrival-simulation-destination-congestion";
  congestionMode: EnergyDecisionCongestionMode;
  validation: SimulationValidation;
}

export interface ComputeSimulationEnergyDecisionsInput {
  simulatedShips: unknown;
  congestion: CongestionForecast;
  portCalls?: PortCall[];
  regionalCongestion?: RegionCongestionSeries[];
  portConfig?: PortConfig;
  now?: Date;
  congestionMode?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function isSimulatedVesselType(value: unknown): value is SimulatedVesselType {
  return typeof value === "string" && SIMULATED_VESSEL_TYPES.includes(value as SimulatedVesselType);
}

function normalizeCongestionMode(value: unknown): EnergyDecisionCongestionMode {
  return value === "eta-forecast" ? "eta-forecast" : "dashboard-current";
}

function defaultDestinationPortId(portConfig: PortConfig): SimulationDestinationPortId {
  return portConfig.simulationDestinations[0]?.id ?? "busan-north";
}

function normalizeDestinationPortId(
  value: unknown,
  portConfig: PortConfig
): { destinationPortId?: SimulationDestinationPortId; invalid: boolean } {
  if (value == null || value === "") return { destinationPortId: defaultDestinationPortId(portConfig), invalid: false };
  const found = portConfig.simulationDestinations.find((destination) => destination.id === value);
  return found ? { destinationPortId: found.id, invalid: false } : { invalid: true };
}

function normalizeScenarioSource(value: unknown): { source: ScenarioShipSource; invalid: boolean } {
  if (value == null || value === "" || value === "simulation" || value === "manual") return { source: "manual", invalid: false };
  if (value === "ais-snapshot") return { source: "ais-snapshot", invalid: false };
  return { source: "manual", invalid: true };
}

function pushIssue(issues: SimulationValidationIssue[], index: number, message: string) {
  issues.push({ index, message });
}

export function normalizeSimulatedShipsForDecision(value: unknown, portConfig: PortConfig = BUSAN_PORT): {
  ships: EnergyDecisionShipInput[];
  validation: SimulationValidation;
} {
  const issues: SimulationValidationIssue[] = [];
  if (!Array.isArray(value)) {
    return {
      ships: [],
      validation: {
        acceptedCount: 0,
        rejectedCount: 0,
        issues: [{ index: "simulatedShips", message: "simulatedShips는 배열이어야 합니다." }],
      },
    };
  }

  const ships: EnergyDecisionShipInput[] = [];

  value.forEach((raw, index) => {
    if (!isRecord(raw)) {
      pushIssue(issues, index, "선박 항목은 객체여야 합니다.");
      return;
    }

    const id = typeof raw.id === "string" ? raw.id.trim() : "";
    const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : `SIM VESSEL ${String(index + 1).padStart(2, "0")}`;
    const lat = finiteNumber(raw.lat);
    const lng = finiteNumber(raw.lng);
    const sog = finiteNumber(raw.sog);
    const grossTonnage = finiteNumber(raw.grossTonnage);
    const vesselType = raw.vesselType;
    const destination = normalizeDestinationPortId(raw.destinationPortId, portConfig);
    const scenarioSource = normalizeScenarioSource(raw.source);

    if (!id) {
      pushIssue(issues, index, "id가 없거나 비어 있습니다.");
      return;
    }
    if (scenarioSource.invalid) {
      pushIssue(issues, index, 'source는 "manual" 또는 "ais-snapshot"이어야 합니다.');
      return;
    }
    if (raw.status !== "underway") {
      pushIssue(issues, index, 'status는 "underway"이어야 합니다.');
      return;
    }
    if (lat == null || lat < -90 || lat > 90) {
      pushIssue(issues, index, "lat은 -90 이상 90 이하의 숫자여야 합니다.");
      return;
    }
    if (lng == null || lng < -180 || lng > 180) {
      pushIssue(issues, index, "lng는 -180 이상 180 이하의 숫자여야 합니다.");
      return;
    }
    if (sog == null || sog < 3 || sog > 30) {
      pushIssue(issues, index, "sog는 3 이상 30 이하의 숫자여야 합니다.");
      return;
    }
    if (vesselType != null && !isSimulatedVesselType(vesselType)) {
      pushIssue(issues, index, "vesselType이 지원 범위가 아닙니다.");
      return;
    }
    if (grossTonnage != null && grossTonnage < 100) {
      pushIssue(issues, index, "grossTonnage는 100 이상의 숫자여야 합니다.");
      return;
    }
    if (destination.invalid || !destination.destinationPortId) {
      pushIssue(issues, index, "destinationPortId가 지원 범위가 아닙니다.");
      return;
    }

    ships.push({
      id,
      name,
      lat,
      lon: lng,
      sog,
      status: "underway",
      ...(isSimulatedVesselType(vesselType) ? { vesselType } : {}),
      ...(grossTonnage != null ? { grossTonnage: Math.round(grossTonnage) } : {}),
      destinationPortId: destination.destinationPortId,
      source: scenarioSource.source,
      isSimulated: true,
      ...(typeof raw.originalShipId === "string" ? { originalShipId: raw.originalShipId } : {}),
      ...(typeof raw.mmsi === "string" ? { mmsi: raw.mmsi } : {}),
      ...(typeof raw.imo === "string" ? { imo: raw.imo } : {}),
      ...(typeof raw.callSign === "string" ? { callSign: raw.callSign } : {}),
      ...(typeof raw.snapshotAt === "string" ? { snapshotAt: raw.snapshotAt } : {}),
    });
  });

  return {
    ships,
    validation: {
      acceptedCount: ships.length,
      rejectedCount: value.length - ships.length,
      issues,
    },
  };
}

export function computeSimulationEnergyDecisions(input: ComputeSimulationEnergyDecisionsInput): SimulationEnergyDecisionResult {
  const portConfig = input.portConfig ?? BUSAN_PORT;
  const { ships, validation } = normalizeSimulatedShipsForDecision(input.simulatedShips, portConfig);
  const congestionMode = normalizeCongestionMode(input.congestionMode);
  const result = computeEnergyDecisions({
    ships,
    congestion: input.congestion,
    portCalls: input.portCalls ?? [],
    regionalCongestion: input.regionalCongestion,
    portConfig,
    now: input.now,
    mode: "simulation",
    congestionMode,
  });

  return {
    ...result,
    mode: "simulation",
    congestionMode,
    basis:
      congestionMode === "dashboard-current"
        ? "jit-arrival-simulation-destination-congestion"
        : "jit-arrival-simulation",
    validation,
  };
}
