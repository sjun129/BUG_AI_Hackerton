import type { ShipStatus } from "@/frontend/types/domain";

export const STATUS_LABEL: Record<ShipStatus, string> = {
  underway: "항해 중",
  anchored: "묘박",
  moored: "접안",
};

export const CII_GRADE_COLOR: Record<"A" | "B" | "C" | "D" | "E", string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  E: "#ef4444",
};

export const CII_GRADE_BANDS = [
  { grade: "A", color: "#22c55e", max: 1.6 },
  { grade: "B", color: "#84cc16", max: 2.0 },
  { grade: "C", color: "#eab308", max: 2.4 },
  { grade: "D", color: "#f97316", max: 2.9 },
  { grade: "E", color: "#ef4444", max: 99 },
] as const;

export const DEMO_ENGINE = {
  state: "NORMAL",
  rpm: 54,
  loadPct: null,
  sfocGkwh: 31.3,
  slipPct: 30.3,
  egtC: 301.5,
  loTempC: 40.5,
};

export const DEMO_TYPHOON = [
  { name: "Sintaku", latText: "23.6°N", lonText: "145.8°E", timeUtc: "2026-04-18 00:00" },
  { name: "Sintaku", latText: "20.6°N", lonText: "144.6°E", timeUtc: "2026-04-17 00:00" },
  { name: "Sintaku", latText: "18.2°N", lonText: "144.2°E", timeUtc: "2026-04-16 00:00" },
  { name: "Sintaku", latText: "16.0°N", lonText: "145.1°E", timeUtc: "2026-04-15 00:00" },
  { name: "Sintaku", latText: "15.1°N", lonText: "145.7°E", timeUtc: "2026-04-14 12:00" },
] as const;

export type CiiCurvePoint = { speed: number; cii: number };

export const CII_CURVE_POINTS: CiiCurvePoint[] = Array.from({ length: 11 }, (_, i) => {
  const speed = 8 + i * 0.5;
  return { speed, cii: Math.round(1.15 * Math.pow(speed / 8, 1.9) * 1000) / 1000 };
});

export function beaufortFromWindMs(ms: number): number {
  const upper = [0.3, 1.6, 3.4, 5.5, 8, 10.8, 13.9, 17.2, 20.8, 24.5, 28.5, 32.7];
  for (let i = 0; i < upper.length; i += 1) {
    if (ms < upper[i]) return i;
  }
  return 12;
}

export function windDir8(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round(deg / 45) % 8];
}
