import assert from "node:assert/strict";
import type { CongestionForecast, RegionCongestionSeries } from "../backend/ports/port-types";
import { BUSAN_PORT } from "../backend/ports/seed-port";
import { computeRouteScenarioRecommendations } from "../backend/prediction/routes/route-recommendation";
import { normalizeSimulatedShipsForDecision } from "../backend/prediction/simulation-energy";

const now = new Date("2026-07-04T00:00:00.000Z");

const congestion: CongestionForecast = {
  port: BUSAN_PORT.name,
  currentLevel: 0.2,
  source: "port-mis",
  basis: "port-mis-arrivals-and-current-in-port",
  lastUpdated: now.toISOString(),
  forecast: [],
};

const regionalCongestion: RegionCongestionSeries[] = BUSAN_PORT.congestionRegions.map((region) => ({
  id: region.id,
  name: region.name,
  currentLevel: region.id === "sinhang" ? 0.92 : 0.54,
  forecast: [],
  arrivals: 0,
  departures: 0,
  activityWindowHours: 24,
  currentVessels: 0,
  aisSeparable: region.aisSeparable,
  source: "test-regional",
}));

const { ships, validation } = normalizeSimulatedShipsForDecision(
  [
    {
      id: "sim-busan-new",
      name: "SIM BUSAN NEW",
      lat: 34.92,
      lng: 129.08,
      sog: 12,
      status: "underway",
      vesselType: "container",
      grossTonnage: 80000,
      destinationPortId: "busan-new",
      source: "manual",
    },
  ],
  BUSAN_PORT
);

assert.equal(validation.acceptedCount, 1);
assert.equal(validation.rejectedCount, 0);

const result = computeRouteScenarioRecommendations({
  ships,
  congestion,
  regionalCongestion,
  portConfig: BUSAN_PORT,
  now,
});

assert.equal(result.source, "deterministic-route-scenario");
assert.equal(result.mode, "simulation");
assert.equal(result.basis, "predefined-approach-route-comparison");
assert.ok(result.calculationNote.includes("실제 항해 지시가 아닙니다"));
assert.equal(result.summary.shipCount, 1);
assert.equal(result.summary.recommendedCount, 1);

const shipResult = result.results[0];
assert.equal(shipResult.destinationPortId, "busan-new");
assert.ok(shipResult.routeScenarios.length >= 2);
assert.equal(shipResult.routeScenarios.filter((scenario) => scenario.isRecommended).length, 1);

const ranks = shipResult.routeScenarios.map((scenario) => scenario.rank);
assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));

for (const scenario of shipResult.routeScenarios) {
  assert.ok(scenario.distanceNm > 0);
  assert.ok(scenario.score > 0);
  assert.ok(Number.isFinite(scenario.estimatedFuelKg));
  assert.ok(Number.isFinite(scenario.estimatedCo2Kg));
  assert.ok(scenario.calculationBasis.some((basis) => basis.includes("MVP weighted comparison score")));
  assert.ok(scenario.warnings.some((warning) => warning.includes("실제 항해 지시가 아닙니다")));
}

console.log("route scenario validation passed");
