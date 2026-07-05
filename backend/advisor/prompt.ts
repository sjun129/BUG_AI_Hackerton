// 선박·혼잡도 상황을 LLM이 이해할 수 있는 프롬프트로 변환한다.

import type { CongestionForecast, Ship } from "../ports/port-types";

export function buildAdvisorPrompt(
  ships: Ship[],
  congestion: CongestionForecast,
  userMessage?: string
): string {
  const shipSummary = ships
    .map(
      (s) =>
        `- ${s.name} (MMSI ${s.mmsi}): 상태=${s.status}, 속력=${s.sog}kn, ETA=${s.eta}` +
        (s.destinationBerthId ? `, 목적 선석=${s.destinationBerthId}` : "")
    )
    .join("\n");

  const forecastSummary = congestion.forecast.map((f) => `- ${f.time}: 혼잡도 ${f.level}`).join("\n");

  // 사용자가 채팅으로 질문을 보냈으면 그 질문에 초점을 맞춰 답하도록 지시한다.
  const trimmed = userMessage?.trim();
  const questionSection = trimmed
    ? `\n## 운영자 질문\n"${trimmed}"\n이 질문에 우선 답하세요. summary에 질문에 대한 답을 담고, 관련 선박이 있으면 recommendations에 포함하세요.\n`
    : "";

  return `당신은 ${congestion.port} 항만 운영 어드바이저입니다. 아래 선박 현황과 혼잡도 예측을 보고 운영 권고를 제시하세요.

## 현재 선박 현황
${shipSummary}

## 혼잡도 예측 (시간대별, 0~1)
현재 혼잡도: ${congestion.currentLevel}
${forecastSummary}
${questionSection}
## 출력 형식
아래 JSON 스키마와 정확히 일치하는 JSON 객체만 출력하세요. 코드 블록이나 설명 문장을 덧붙이지 마세요.

{
  "summary": "현재 상황에 대한 한두 문장 요약",
  "recommendations": [
    { "mmsi": "선박 MMSI", "action": "구체적인 권고 행동", "reason": "권고 이유" }
  ],
  "peakTime": "혼잡도가 가장 높은 시각 (ISO 8601)"
}`;
}
