import { fetchShips } from "@/backend/ais/ship-source";
import { BUSAN_PORT } from "@/backend/ports/seed-port";
import { computeCongestionForecast } from "@/backend/prediction/congestion";
import { fetchPortCongestion } from "@/backend/portmis/congestion-source";

export const runtime = "nodejs";
// ships/route.ts와 동일한 이유 — Supabase 조회가 fetch 기반이라 캐싱을 명시적으로 꺼야 한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  // 주 소스: Port-MIS 입항 신고 기반 혼잡도(enrich:portmis가 저장). 신항 포함 전수이고
  // 미래 입항 신고까지 반영해 실제 예측이 된다.
  const mis = await fetchPortCongestion();
  if (mis) return Response.json(mis);

  // 폴백: Port-MIS 스냅샷이 아직 없으면 AIS 기반으로 계산해 응답.
  const ships = await fetchShips();
  return Response.json(computeCongestionForecast(ships, BUSAN_PORT));
}
