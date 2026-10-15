"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SIMULATION_DESTINATION_ID, SIMULATION_DESTINATION_PORTS } from "@/frontend/config/ports";
import type { NewSimulatedShipInput, ScenarioShipSource, SimulatedShip } from "@/frontend/types/simulation";
import { isSimulatedVesselType } from "@/frontend/types/simulation";

export const SIMULATED_SHIPS_STORAGE_KEY = "bug-ai-hackathon:simulated-ships";

function createSimulationId(source: ScenarioShipSource, input?: Pick<NewSimulatedShipInput, "id" | "mmsi" | "originalShipId">): string {
  if (input?.id) return input.id;
  const prefix = source === "ais-snapshot" ? "snapshot" : "sim";
  const stableId = input?.originalShipId ?? input?.mmsi;
  if (stableId) return `${prefix}-${stableId}-${Date.now()}`;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function defaultDestinationPortId(): SimulatedShip["destinationPortId"] {
  return DEFAULT_SIMULATION_DESTINATION_ID;
}

function normalizeDestinationPortId(value: unknown): SimulatedShip["destinationPortId"] {
  return SIMULATION_DESTINATION_PORTS.some((destination) => destination.id === value)
    ? (value as SimulatedShip["destinationPortId"])
    : defaultDestinationPortId();
}

function normalizeSource(value: unknown): ScenarioShipSource {
  return value === "ais-snapshot" ? "ais-snapshot" : "manual";
}

function normalizeSimulatedShip(value: unknown): SimulatedShip | null {
  if (!value || typeof value !== "object") return null;
  const ship = value as Record<string, unknown>;
  if (
    typeof ship.id !== "string" ||
    typeof ship.name !== "string" ||
    !isFiniteNumber(ship.lat) ||
    !isFiniteNumber(ship.lng) ||
    !isFiniteNumber(ship.sog) ||
    ship.status !== "underway" ||
    typeof ship.createdAt !== "string"
  ) {
    return null;
  }
  const vesselType = isSimulatedVesselType(ship.vesselType) ? ship.vesselType : undefined;
  const grossTonnage = isFiniteNumber(ship.grossTonnage) && ship.grossTonnage >= 100 ? Math.round(ship.grossTonnage) : undefined;

  return {
    id: ship.id,
    name: ship.name,
    lat: ship.lat,
    lng: ship.lng,
    sog: ship.sog,
    status: "underway",
    ...(vesselType ? { vesselType } : {}),
    ...(grossTonnage != null ? { grossTonnage } : {}),
    destinationPortId: normalizeDestinationPortId(ship.destinationPortId),
    source: normalizeSource(ship.source),
    createdAt: ship.createdAt,
    ...(typeof ship.originalShipId === "string" ? { originalShipId: ship.originalShipId } : {}),
    ...(typeof ship.mmsi === "string" ? { mmsi: ship.mmsi } : {}),
    ...(typeof ship.imo === "string" ? { imo: ship.imo } : {}),
    ...(typeof ship.callSign === "string" ? { callSign: ship.callSign } : {}),
    ...(typeof ship.snapshotAt === "string" ? { snapshotAt: ship.snapshotAt } : {}),
  };
}

function parseStoredShips(raw: string | null): SimulatedShip[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSimulatedShip).filter((ship): ship is SimulatedShip => Boolean(ship));
  } catch {
    return [];
  }
}

export function useSimulatedShips() {
  const [simulatedShips, setSimulatedShips] = useState<SimulatedShip[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSimulatedShips(parseStoredShips(window.localStorage.getItem(SIMULATED_SHIPS_STORAGE_KEY)));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    window.localStorage.setItem(SIMULATED_SHIPS_STORAGE_KEY, JSON.stringify(simulatedShips));
  }, [hydrated, simulatedShips]);

  const addSimulatedShip = useCallback((input: NewSimulatedShipInput) => {
    const source = normalizeSource(input.source);
    const ship: SimulatedShip = {
      ...input,
      id: createSimulationId(source, input),
      status: "underway",
      source,
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
    setSimulatedShips((prev) => [...prev, ship]);
    return ship;
  }, []);

  const removeSimulatedShip = useCallback((id: string) => {
    setSimulatedShips((prev) => prev.filter((ship) => ship.id !== id));
  }, []);

  const clearSimulatedShips = useCallback(() => {
    setSimulatedShips([]);
  }, []);

  return {
    simulatedShips,
    hydrated,
    addSimulatedShip,
    removeSimulatedShip,
    clearSimulatedShips,
  };
}
