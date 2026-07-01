// 혼잡도 예측 — ML 없이 시간대별 입항 예정 선박 수를 집계해 0~1로 정규화한 통계 기반 곡선.

import type { CongestionForecast, CongestionPoint, PortConfig, Ship } from "../ports/port-types";

const FORECAST_HOURS = 12;

function hourBucketKey(iso: string): string {
  const d = new Date(iso);
  d.setMinutes(0, 0, 0);
  return d.toISOString();
}

export function computeCongestionForecast(
  ships: Ship[],
  config: PortConfig,
  now: Date = new Date()
): CongestionForecast {
  const arrivingShips = ships.filter((s) => s.status === "underway");

  const startHour = new Date(now);
  startHour.setMinutes(0, 0, 0);

  const forecast: CongestionPoint[] = [];
  for (let h = 0; h < FORECAST_HOURS; h++) {
    const bucketStart = new Date(startHour.getTime() + h * 60 * 60 * 1000);
    const bucketKey = bucketStart.toISOString();

    const arrivalsInHour = arrivingShips.filter((s) => hourBucketKey(s.eta) === bucketKey).length;
    const level = Math.min(1, arrivalsInHour / config.shipsPerHourCapacity);

    forecast.push({ time: bucketKey, level: Number(level.toFixed(2)) });
  }

  const currentLevel = forecast[0]?.level ?? 0;

  return {
    port: config.name,
    currentLevel,
    forecast,
  };
}
