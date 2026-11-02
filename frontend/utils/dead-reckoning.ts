import type { Ship } from "@/frontend/types/domain";

// AIS 스냅샷 위치를 침로(COG)·속력(SOG)대로 경과 시간만큼 직선 이동시킨 "추정 위치"(추측항법).
// 실 항적이 아니라 화면용 추정이다 — 항해 중(underway)이고 실제로 움직이는 배만 옮긴다.
// ponytail: 직선·평면 근사라 오래 돌리면 육지를 지날 수 있다. 경과 시간을 MAX_ELAPSED_MS로 묶는다.

const KNOT_KM_PER_HOUR = 1.852;
const KM_PER_DEG_LAT = 111.32;
const MIN_MOVING_SOG = 0.5; // 이보다 느리면 정지(표류·계류 오차)로 보고 옮기지 않는다
export const MAX_ELAPSED_MS = 30 * 60_000; // 데모 1회분 — 이 이상은 더 옮기지 않는다

export function deadReckon(ship: Ship, elapsedMs: number): Ship {
  if (ship.status !== "underway" || ship.sog < MIN_MOVING_SOG || elapsedMs <= 0) return ship;
  const hours = Math.min(elapsedMs, MAX_ELAPSED_MS) / 3_600_000;
  const distKm = ship.sog * KNOT_KM_PER_HOUR * hours;
  const rad = (ship.cog * Math.PI) / 180;
  const dLat = (distKm * Math.cos(rad)) / KM_PER_DEG_LAT;
  const dLon = (distKm * Math.sin(rad)) / (KM_PER_DEG_LAT * Math.cos((ship.lat * Math.PI) / 180));
  return { ...ship, lat: ship.lat + dLat, lon: ship.lon + dLon };
}
