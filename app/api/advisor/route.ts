import { generateText } from "ai";
import { advisorModel } from "@/backend/models";
import { fetchShips } from "@/backend/ais/ship-source";
import { fetchPortCalls } from "@/backend/portmis/portcall-source";
import { resolveCongestion } from "@/backend/congestion/resolve-congestion";
import { resolveRegionalCongestion } from "@/backend/congestion/regional-congestion";
import { buildAdvisorPrompt } from "@/backend/advisor/prompt";
import { parseAdvisorResult } from "@/backend/advisor/parse";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해주세요." },
        { status: 503 }
      );
    }

    // 채팅 입력(선택). 본문이 비었거나 잘못된 JSON이어도 안전하게 무시한다.
    let userMessage: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.message === "string") userMessage = body.message;
    } catch {
      // 본문 없음 — 일반 운영 권고로 처리
    }

    // 선박 목록(지도/프롬프트용)은 실시간 위치를 그대로 쓰되, 혼잡도는 통계 기반으로 계산한다.
    // 정박 현황(Port-MIS)·지역별 혼잡도도 함께 넘겨 대시보드에 보이는 데이터라면 무엇이든 답할 수 있게 한다.
    const [ships, congestion, portCalls, regions] = await Promise.all([
      fetchShips(),
      resolveCongestion(),
      fetchPortCalls(),
      resolveRegionalCongestion(),
    ]);
    const prompt = buildAdvisorPrompt(ships, congestion, portCalls, regions, userMessage);

    const { text } = await generateText({ model: advisorModel, prompt });
    const result = parseAdvisorResult(text);

    return Response.json(result);
  } catch (err) {
    console.error("[/api/advisor]", err);
    return Response.json({ error: "어드바이저 응답 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
