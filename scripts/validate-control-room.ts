import assert from "node:assert/strict";
import { buildControlRoomFallbackBriefing } from "../backend/advisor/control-room-advisor";
import {
  buildPriorityTargets,
  type ControlRoomPriorityDecision,
  type ControlRoomSnapshot,
} from "../backend/services/control-room-service";

const decisions: ControlRoomPriorityDecision[] = [
  {
    shipName: "LOW IMPACT",
    destinationPortName: "부산항 북항",
    currentSpeedKn: 12,
    recommendedSpeedKn: 10,
    reducedWaitingMinutes: 20,
    estimatedFuelSavedKg: 200,
    estimatedCo2ReducedKg: 620,
    currentCongestionLevel: 0.5,
    grossTonnage: 20000,
    confidence: "medium",
  },
  {
    shipName: "HIGH IMPACT",
    destinationPortName: "부산신항",
    currentSpeedKn: 15,
    recommendedSpeedKn: 11,
    reducedWaitingMinutes: 80,
    estimatedFuelSavedKg: 1200,
    estimatedCo2ReducedKg: 3720,
    currentCongestionLevel: 0.9,
    grossTonnage: 90000,
    confidence: "high",
  },
];

const targets = buildPriorityTargets(decisions);
assert.equal(targets.length, 2);
assert.equal(targets[0].rank, 1);
assert.equal(targets[0].shipName, "HIGH IMPACT");
assert.ok(targets[0].priorityScore > targets[1].priorityScore);
assert.ok(targets[0].reasonBasis.some((reason) => reason.includes("CO2")));

const emptyTargets = buildPriorityTargets([]);
assert.deepEqual(emptyTargets, []);

const snapshot: ControlRoomSnapshot = {
  generatedAt: "2026-07-09T00:00:00.000Z",
  ports: [
    {
      id: "busan-new",
      name: "부산신항",
      congestionLevel: 0.91,
      congestionStatus: "혼잡",
      waitingOrAnchoredCount: 12,
      arrivingCount: 4,
    },
  ],
  ships: { total: 10, underway: 6, berthed: 2, anchored: 2 },
  energy: {
    candidateCount: 2,
    recommendedCount: 2,
    totalReducedWaitingMinutes: 100,
    totalEstimatedFuelSavedKg: 1400,
    totalEstimatedCo2ReducedKg: 4340,
    topTargets: [],
  },
  routeScenario: {
    scenarioCount: 0,
    recommendedRouteCount: 0,
    highlights: ["서버에 저장된 시뮬레이션 경로 추천 결과가 없습니다."],
  },
  dataSources: ["test"],
  limitations: ["test limitation"],
};

const fallback = buildControlRoomFallbackBriefing(snapshot, targets);
assert.equal(fallback.source, "rule-based-fallback");
assert.equal(fallback.riskLevel, "high");
assert.equal(fallback.priorityVessels.length, 2);
assert.equal(fallback.priorityVessels[0].rank, 1);
assert.ok(fallback.disclaimer.includes("실제 항해 지시가 아닙니다"));

const noTargetFallback = buildControlRoomFallbackBriefing(
  { ...snapshot, energy: { ...snapshot.energy, recommendedCount: 0 } },
  []
);
assert.equal(noTargetFallback.priorityVessels.length, 0);
assert.ok(noTargetFallback.priorityActions.some((item) => item.includes("현재 JIT 감속 권고 대상 선박이 없습니다")));

console.log("control room validation passed");
