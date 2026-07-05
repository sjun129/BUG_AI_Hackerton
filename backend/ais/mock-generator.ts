// 부산항 근처 목업 선박을 생성한다. 실 AIS 피드로 교체할 때는 이 파일만 바꾸면 되고,
// 나머지 코드(prediction, advisor, frontend)는 Ship[] 타입만 알면 되므로 영향받지 않는다.

import type { PortConfig, Ship, ShipStatus } from "../ports/port-types";

const NAME_PREFIXES = [
  "HMM", "MSC", "MAERSK", "COSCO", "EVERGREEN", "ONE", "CMA CGM", "YANG MING", "SITC", "PANOCEAN",
];
const NAME_SUFFIXES = [
  "PRESTIGE", "BUSAN", "PACIFIC", "STAR", "VOYAGER", "HORIZON", "GLORY", "PIONEER", "OCEAN", "TRADER",
];

// 매 호출마다 다른 목업 데이터가 나오면 디버깅이 어려워지므로, 시드 기반의 결정론적 PRNG를 쓴다.
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

function randomShipName(rand: () => number, index: number): string {
  const prefix = NAME_PREFIXES[Math.floor(rand() * NAME_PREFIXES.length)];
  const suffix = NAME_SUFFIXES[Math.floor(rand() * NAME_SUFFIXES.length)];
  return `${prefix} ${suffix} ${index}`;
}

function randomMmsi(rand: () => number): string {
  return String(440000000 + Math.floor(rand() * 9999999));
}

function randomPointWithinRadius(
  center: { lat: number; lon: number },
  radiusKm: number,
  rand: () => number
): { lat: number; lon: number } {
  const radiusDeg = radiusKm / 111; // 대략 1도 ≈ 111km
  const angle = rand() * Math.PI * 2;
  const r = Math.sqrt(rand()) * radiusDeg; // sqrt로 반경 내 균등 분포
  return {
    lat: center.lat + r * Math.cos(angle),
    lon: center.lon + (r * Math.sin(angle)) / Math.cos((center.lat * Math.PI) / 180),
  };
}

function bearingTo(from: { lat: number; lon: number }, to: { lat: number; lon: number }): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLon = toRad(to.lon - from.lon);
  const y = Math.sin(dLon) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLon);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export interface GenerateMockShipsOptions {
  count?: number;
  seed?: number;
}

export function generateMockShips(config: PortConfig, options: GenerateMockShipsOptions = {}): Ship[] {
  const count = options.count ?? 18;
  const rand = seededRandom(options.seed ?? 42);
  const nowIso = new Date().toISOString();
  const ships: Ship[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rand();
    const status: ShipStatus = roll < 0.55 ? "underway" : roll < 0.75 ? "anchored" : "moored";
    const mmsi = randomMmsi(rand);
    const name = randomShipName(rand, i + 1);

    if (status === "moored") {
      const berth = config.berths[Math.floor(rand() * config.berths.length)];
      ships.push({
        mmsi,
        name,
        lat: berth.lat,
        lon: berth.lon,
        sog: 0,
        cog: Math.floor(rand() * 360),
        eta: nowIso, // 이미 접안 완료
        status,
        destinationBerthId: berth.id,
      });
      continue;
    }

    if (status === "anchored") {
      const anchorage = config.zones.find((z) => z.id === "zone-anchorage") ?? config.zones[0];
      const point = randomPointWithinRadius(anchorage.center, anchorage.radiusKm, rand);
      ships.push({
        mmsi,
        name,
        lat: point.lat,
        lon: point.lon,
        sog: Number((rand() * 0.5).toFixed(1)),
        cog: Math.floor(rand() * 360),
        eta: nowIso, // 접안 대기 중 — 별도 스케줄 없이는 ETA 미정
        status,
      });
      continue;
    }

    // underway: 항계 반경 내 임의 위치에서 항구를 향해 항해 중
    const point = randomPointWithinRadius(config.center, config.mockAreaRadiusKm, rand);
    const sog = Number((6 + rand() * 14).toFixed(1)); // 6~20 knots
    const cog = Math.floor(bearingTo(point, config.center));
    const destinationBerth = config.berths[Math.floor(rand() * config.berths.length)];

    ships.push({
      mmsi,
      name,
      lat: point.lat,
      lon: point.lon,
      sog,
      cog,
      eta: nowIso, // placeholder — backend/prediction/eta.ts 로 실제 계산 후 mock-data.ts에서 덮어씀
      status,
      destinationBerthId: destinationBerth.id,
    });
  }

  return ships;
}
