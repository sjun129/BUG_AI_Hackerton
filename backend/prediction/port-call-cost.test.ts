import assert from "node:assert/strict";
import { BUSAN_PORT } from "../ports/seed-port";
import {
  computeCrewLaborCostUsd,
  computePortCallCost,
  computeReeferPowerCostUsd,
  computeTugFeeUsd,
  computeWaitingCostUsd,
} from "./port-call-cost";

// ── 1) 예선료: GT 구간이 커질수록 비감소(단조 증가) ──
{
  const fees = [5000, 15000, 40000, 100000].map((gt) => computeTugFeeUsd(gt, BUSAN_PORT));
  for (let i = 1; i < fees.length; i++) assert.ok(fees[i] >= fees[i - 1], "GT가 클수록 예선료 비감소");
  assert.equal(fees[0], BUSAN_PORT.portCallCost.tugFeeTiers[0].feeUsd);
}

// ── 2) 대기비용: 시간에 비례, 규모 클수록 시간당 단가 큼 ──
{
  const small = computeWaitingCostUsd(10, 5000, BUSAN_PORT);
  const large = computeWaitingCostUsd(10, 90000, BUSAN_PORT);
  assert.ok(large > small, "대형선 대기비용이 더 큼(동일 대기시간)");
  assert.equal(computeWaitingCostUsd(0, 5000, BUSAN_PORT), 0, "대기시간 0이면 비용 0");
  const doubled = computeWaitingCostUsd(20, 5000, BUSAN_PORT);
  assert.ok(Math.abs(doubled - small * 2) < 1e-6, "대기시간에 비례");
}

// ── 3) 선원 인건비: crewCount 실측이 있으면 그걸 쓰고, 없으면 규모별 대체값 ──
{
  const withCrew = computeCrewLaborCostUsd(24, 20000, BUSAN_PORT, 30);
  const withoutCrew = computeCrewLaborCostUsd(24, 20000, BUSAN_PORT);
  const expectedDefault = BUSAN_PORT.portCallCost.defaultCrewBySizeTier.medium * BUSAN_PORT.portCallCost.crewDailyWageUsd * 1;
  assert.ok(Math.abs(withoutCrew - expectedDefault) < 1e-6, "crewCount 없으면 규모별 대체값 사용");
  assert.notEqual(withCrew, withoutCrew, "실측 crewCount가 있으면 다른 값");
}

// ── 4) 냉동컨테이너 전력비: reefer 선종만 부과, 나머지는 0 ──
{
  const reefer = computeReeferPowerCostUsd("냉동선", 80000, 24, BUSAN_PORT);
  const container = computeReeferPowerCostUsd("컨테이너선", 80000, 24, BUSAN_PORT);
  assert.ok(reefer > 0, "냉동선은 전력비 발생");
  assert.equal(container, 0, "일반 컨테이너선은 전력비 없음");
}

// ── 5) 종합: 총액 = 각 항목의 합, 항해구간 없으면 voyageFuel=null ──
{
  const r = computePortCallCost(
    { vesselType: "컨테이너선", grossTonnage: 50000, crewCount: 22, berthHours: 24, waitingHours: 6, year: 2026 },
    BUSAN_PORT
  );
  const sum =
    (r.voyageFuel?.costUsd ?? 0) +
    r.hotelingFuel.costUsd +
    r.portDue.totalDueUsd +
    r.tugFeeUsd +
    r.waitingCostUsd +
    r.crewLaborCostUsd +
    r.reeferPowerCostUsd;
  assert.equal(r.voyageFuel, null, "distanceNm 없으면 항해연료 없음");
  assert.ok(Math.abs(r.totalUsd - sum) < 1, "총액 = 항목 합");
  assert.ok(r.totalUsd > 0);
}

// ── 6) distanceNm이 있으면 항해연료비도 포함되어 총액이 커진다 ──
{
  const withoutVoyage = computePortCallCost({ vesselType: "탱커", grossTonnage: 60000, berthHours: 24 }, BUSAN_PORT);
  const withVoyage = computePortCallCost(
    { vesselType: "탱커", grossTonnage: 60000, berthHours: 24, distanceNm: 200, speedKn: 12 },
    BUSAN_PORT
  );
  assert.ok(withVoyage.voyageFuel != null && withVoyage.voyageFuel.costUsd > 0);
  assert.ok(withVoyage.totalUsd > withoutVoyage.totalUsd, "항해연료비만큼 총액 증가");
}

console.log("port-call-cost validation passed");
