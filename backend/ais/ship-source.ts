// 선박 데이터 소스 — DB(Supabase)에서 읽고, 미설정/오류/빈 테이블이면 목업으로 폴백한다.
// 이 파일이 Ship[] 타입만 지키면 prediction/advisor/frontend 는 수정할 필요가 없다.

import type { Ship } from "../ports/port-types";
import { MOCK_SHIPS } from "./mock-data";
import { getSupabase } from "../db/supabase";

// DB 컬럼(snake_case) ↔ 도메인 타입(camelCase) 매핑
interface ShipRow {
  mmsi: string;
  name: string;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
  eta: string;
  status: Ship["status"];
  destination_berth_id: string | null;
}

function rowToShip(r: ShipRow): Ship {
  return {
    mmsi: r.mmsi,
    name: r.name,
    lat: r.lat,
    lon: r.lon,
    sog: r.sog,
    cog: r.cog,
    eta: new Date(r.eta).toISOString(),
    status: r.status,
    ...(r.destination_berth_id ? { destinationBerthId: r.destination_berth_id } : {}),
  };
}

/** Ship → DB row (seed/insert 용). */
export function shipToRow(s: Ship): ShipRow {
  return {
    mmsi: s.mmsi,
    name: s.name,
    lat: s.lat,
    lon: s.lon,
    sog: s.sog,
    cog: s.cog,
    eta: s.eta,
    status: s.status,
    destination_berth_id: s.destinationBerthId ?? null,
  };
}

/**
 * 현재 선박 목록을 반환한다.
 * DB가 설정돼 있고 데이터가 있으면 DB에서, 아니면 목업에서 읽는다.
 */
export async function fetchShips(): Promise<Ship[]> {
  const db = getSupabase();
  if (!db) return MOCK_SHIPS;

  const { data, error } = await db.from("ships").select("*");
  if (error) {
    console.error("[ship-source] Supabase 조회 실패, 목업으로 폴백:", error.message);
    return MOCK_SHIPS;
  }
  if (!data || data.length === 0) return MOCK_SHIPS;

  return (data as ShipRow[]).map(rowToShip);
}
