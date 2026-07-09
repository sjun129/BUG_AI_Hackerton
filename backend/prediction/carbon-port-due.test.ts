import assert from "node:assert/strict";
import { BUSAN_PORT } from "../ports/seed-port";
import { computeCiiStatus } from "./cii";
import { computeCarbonPortDue } from "./carbon-port-due";

const policy = BUSAN_PORT.portDue;

// ── 1) 기본 관계: baseDue=GT×rate, total=base+carbonCost, carbonCost=levy+gradeAdj ──
{
  const r = computeCarbonPortDue({ vesselType: "컨테이너선", grossTonnage: 50000, berthHours: 24, year: 2026 }, BUSAN_PORT);
  assert.equal(r.baseDueUsd, Math.round(50000 * policy.ratePerGtUsd), "표준 입항료 = GT × 요율");
  assert.ok(r.carbonLevyUsd >= 0, "탄소부담금 ≥ 0");
  assert.ok(Math.abs(r.carbonCostUsd - (r.carbonLevyUsd + r.gradeAdjustmentUsd)) <= 1, "탄소비용 = 부담금 + 등급차등");
  assert.ok(Math.abs(r.totalDueUsd - (r.baseDueUsd + r.carbonCostUsd)) <= 1, "최종 = 표준 + 탄소비용");
  assert.ok(Math.abs(r.changePct - (r.carbonCostUsd / r.baseDueUsd) * 100) <= 0.2, "변화율 일관");
  // 등급이 cii.ts 결과와 일치
  assert.equal(r.ciiGrade, computeCiiStatus("컨테이너선", 50000, 2026)?.grade ?? null);
}

// ── 2) 배출 단조성: 큰 배가 더 많이 배출 → 탄소부담금 더 큼 ──
{
  const small = computeCarbonPortDue({ vesselType: "컨테이너선", grossTonnage: 20000, berthHours: 24 }, BUSAN_PORT);
  const large = computeCarbonPortDue({ vesselType: "컨테이너선", grossTonnage: 80000, berthHours: 24 }, BUSAN_PORT);
  assert.ok(large.portCallCo2Ton > small.portCallCo2Ton, "큰 배가 더 많이 배출");
  assert.ok(large.carbonLevyUsd > small.carbonLevyUsd, "큰 배가 부담금 더 큼");
}

// ── 3) 정박이 길수록 배출·부담금 증가(표준 입항료는 불변) ──
{
  const shortStay = computeCarbonPortDue({ vesselType: "탱커", grossTonnage: 40000, berthHours: 12 }, BUSAN_PORT);
  const longStay = computeCarbonPortDue({ vesselType: "탱커", grossTonnage: 40000, berthHours: 48 }, BUSAN_PORT);
  assert.ok(longStay.portCallCo2Ton > shortStay.portCallCo2Ton);
  assert.ok(longStay.carbonLevyUsd > shortStay.carbonLevyUsd);
  assert.equal(shortStay.baseDueUsd, longStay.baseDueUsd, "정박시간은 표준 입항료에 영향 없음");
}

// ── 4) 등급 차등 부호: 청정선(A·B) 할인(−), 저효율선(D·E) 할증(+), C는 0 ──
{
  const r = computeCarbonPortDue({ vesselType: "벌크선", grossTonnage: 30000, year: 2026 }, BUSAN_PORT);
  if (r.ciiGrade === "A" || r.ciiGrade === "B") assert.ok(r.gradeAdjustmentUsd < 0, "청정선 할인");
  if (r.ciiGrade === "D" || r.ciiGrade === "E") assert.ok(r.gradeAdjustmentUsd > 0, "저효율선 할증");
  if (r.ciiGrade === "C") assert.equal(r.gradeAdjustmentUsd, 0, "C등급 차등 없음");
}

// ── 5) 선종 미분류 → 등급 없음 → 차등 0, 탄소비용은 부담금만 ──
{
  const r = computeCarbonPortDue({ grossTonnage: 5000, berthHours: 20 }, BUSAN_PORT);
  assert.equal(r.ciiGrade, null, "선종 미상 → 등급 없음");
  assert.equal(r.gradeAdjustmentUsd, 0, "등급 없으면 차등 0");
  assert.equal(r.carbonCostUsd, r.carbonLevyUsd, "탄소비용 = 부담금");
}

console.log("carbon-port-due validation passed");
