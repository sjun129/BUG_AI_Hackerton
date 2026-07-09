import { computePortCallCost } from "@/backend/prediction/port-call-cost";
import { BUSAN_PORT } from "@/backend/ports/seed-port";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 입항 1건의 총 비용(연료비·입항료·탄소비용·예선료·대기비용·인건비·냉동컨테이너 전력비) 계산 엔드포인트.
// 모델 탑재만 — 실제 화면 연동은 추후.
//   GET /api/port-call-cost?gt=50000&type=컨테이너선&berthHours=24&waitingHours=6
//                           &crew=22&distanceNm=200&speedKn=12&year=2026
//   응답: PortCallCostBreakdown (항목별 비용 + totalUsd)
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;

  const grossTonnage = Number(params.get("gt") ?? params.get("grossTonnage"));
  if (!Number.isFinite(grossTonnage) || grossTonnage <= 0) {
    return Response.json({ error: "gt(총톤수) 쿼리 파라미터가 필요합니다." }, { status: 400 });
  }

  const numOrUndefined = (key: string) => {
    const raw = params.get(key);
    return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : undefined;
  };

  const vesselType = params.get("type") ?? params.get("vesselType") ?? undefined;
  const result = computePortCallCost(
    {
      vesselType,
      grossTonnage,
      crewCount: numOrUndefined("crew"),
      distanceNm: numOrUndefined("distanceNm"),
      speedKn: numOrUndefined("speedKn"),
      berthHours: numOrUndefined("berthHours"),
      waitingHours: numOrUndefined("waitingHours"),
      year: numOrUndefined("year"),
    },
    BUSAN_PORT
  );
  return Response.json(result);
}
