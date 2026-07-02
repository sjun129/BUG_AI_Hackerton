// 초기 선박 데이터를 DB에 주입하는 시드 엔드포인트.
// 스키마(backend/db/schema.sql) 실행 후 한 번 POST 하면 목업 18척이 ships 테이블에 upsert 된다.
//   예) 브라우저 콘솔:  fetch('/api/seed', { method: 'POST' }).then(r=>r.json()).then(console.log)

import { getSupabase } from "@/backend/db/supabase";
import { MOCK_SHIPS } from "@/backend/ais/mock-data";
import { shipToRow } from "@/backend/ais/ship-source";

export const runtime = "nodejs";

export async function POST() {
  const db = getSupabase();
  if (!db) {
    return Response.json(
      { error: "Supabase가 설정되지 않았습니다. .env.local의 URL/키를 확인하세요." },
      { status: 503 }
    );
  }

  const rows = MOCK_SHIPS.map(shipToRow);
  const { error } = await db.from("ships").upsert(rows, { onConflict: "mmsi" });
  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, seeded: rows.length });
}
