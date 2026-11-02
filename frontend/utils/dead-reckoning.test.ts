import assert from "node:assert/strict";
import type { Ship } from "@/frontend/types/domain";
import { deadReckon, MAX_ELAPSED_MS } from "./dead-reckoning";

const base: Ship = { mmsi: "1", name: "T", lat: 35, lon: 129, sog: 10, cog: 0, eta: "", status: "underway" };
const HOUR = 3_600_000;

// 북쪽(0°) 10kn × 30분 = 9.26km → 위도 +0.0832°
const north = deadReckon(base, HOUR / 2);
assert.ok(Math.abs(north.lat - 35 - 9.26 / 111.32) < 1e-6);
assert.equal(north.lon, 129);

// 동쪽(90°)이면 경도만 늘어난다
const east = deadReckon({ ...base, cog: 90 }, HOUR / 2);
assert.ok(east.lon > 129 && Math.abs(east.lat - 35) < 1e-9);

// 정박·계류·저속 선박은 움직이지 않는다
const moored: Ship = { ...base, status: "moored" };
assert.equal(deadReckon(moored, HOUR), moored); // 그대로 같은 객체를 돌려준다
assert.equal(deadReckon({ ...base, status: "anchored" }, HOUR).lat, 35);
assert.equal(deadReckon({ ...base, sog: 0.2 }, HOUR).lat, 35);

// 경과 시간은 MAX_ELAPSED_MS에서 멈춘다
assert.equal(deadReckon(base, MAX_ELAPSED_MS * 4).lat, deadReckon(base, MAX_ELAPSED_MS).lat);

console.log("dead-reckoning validation passed");
