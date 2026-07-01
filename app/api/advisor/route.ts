import { generateText } from "ai";
import { advisorModel } from "@/backend/models";
import { MOCK_SHIPS } from "@/backend/ais/mock-data";
import { BUSAN_PORT } from "@/backend/ports/seed-port";
import { computeCongestionForecast } from "@/backend/prediction/congestion";
import { buildAdvisorPrompt } from "@/backend/advisor/prompt";
import { parseAdvisorResult } from "@/backend/advisor/parse";

export const runtime = "nodejs";

export async function POST() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return Response.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다. .env.local에 키를 추가해주세요." },
        { status: 503 }
      );
    }

    const congestion = computeCongestionForecast(MOCK_SHIPS, BUSAN_PORT);
    const prompt = buildAdvisorPrompt(MOCK_SHIPS, congestion);

    const { text } = await generateText({ model: advisorModel, prompt });
    const result = parseAdvisorResult(text);

    return Response.json(result);
  } catch (err) {
    console.error("[/api/advisor]", err);
    return Response.json({ error: "어드바이저 응답 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}
