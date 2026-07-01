// ETA(입항 예정 시각) 예측 — ML 없이 haversine 거리 ÷ SOG(속력)로 결정론적으로 계산한다.

import type { LatLon } from "../ports/port-types";

const EARTH_RADIUS_KM = 6371;
const KNOTS_TO_KMH = 1.852;
const MIN_SOG_KNOTS = 0.5; // 정지에 가까운 선박이 무한대 ETA를 내지 않도록 하는 하한

export function haversineDistanceKm(a: LatLon, b: LatLon): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

// haversine 거리를 SOG(knots)로 나눠 도착까지 걸리는 시간을 구하고, 현재 시각에 더해 ETA(ISO)를 만든다.
export function computeEta(from: LatLon, to: LatLon, sogKnots: number, now: Date = new Date()): string {
  const distanceKm = haversineDistanceKm(from, to);
  const speedKmh = Math.max(sogKnots, MIN_SOG_KNOTS) * KNOTS_TO_KMH;
  const hours = distanceKm / speedKmh;
  const etaMs = now.getTime() + hours * 60 * 60 * 1000;
  return new Date(etaMs).toISOString();
}
