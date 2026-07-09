// 선박·혼잡도·정박·지역 현황을 LLM이 이해할 수 있는 프롬프트로 변환한다.
// 대시보드에 표시되는 사이트 데이터를 최대한 그대로 넘겨, 운영자가 무엇을 물어보든
// (정박/묘박 척수, 지역별 혼잡도 등) 실제 데이터에 근거해 답할 수 있게 한다.

import type { CongestionForecast, PortCall, RegionCongestionSeries, Ship } from "../ports/port-types";

export function buildAdvisorPrompt(
  ships: Ship[],
  congestion: CongestionForecast,
  portCalls: PortCall[] = [],
  regions: RegionCongestionSeries[] = [],
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

  const berthed = portCalls.filter((c) => c.berthType === "접안");
  const anchored = portCalls.filter((c) => c.berthType === "묘박");
  const portCallSummary =
    portCalls.length > 0
      ? `총 ${portCalls.length}척 (접안 ${berthed.length}척, 묘박 ${anchored.length}척)\n` +
        portCalls
          .slice(0, 40)
          .map(
            (c) =>
              `- ${c.vesselName} (호출부호 ${c.callSign}): ${c.event}, ${c.berthType ?? "-"}${c.berthName ? ` · ${c.berthName}` : ""}` +
              (c.vesselType ? `, 선종=${c.vesselType}` : "")
          )
          .join("\n")
      : "Port-MIS 입출항 신고 데이터 없음";

  const regionSummary =
    regions.length > 0
      ? regions
          .map(
            (r) =>
              `- ${r.name}: 혼잡도 ${r.currentLevel} (해역 ${r.currentVessels}척, 최근 ${r.activityWindowHours}h 입항 ${r.arrivals}·출항 ${r.departures})`
          )
          .join("\n")
      : "지역별 혼잡도 데이터 없음";

  // 사용자가 채팅으로 질문을 보냈으면 그 질문에 초점을 맞춰 답하도록 지시한다.
  const trimmed = userMessage?.trim();
  const questionSection = trimmed
    ? `\n## 운영자 질문\n"${trimmed}"\n아래 데이터 중 질문과 관련된 부분을 찾아 이 질문에 우선 답하세요. summary에 질문에 대한 답을 담으세요. 데이터에 없는 내용은 추측하지 말고 없다고 답하세요.\n`
    : "";

  return `당신은 ${congestion.port} 항만 운영 어드바이저입니다. 아래 선박·정박·지역 현황과 혼잡도 예측을 보고 운영 권고를 제시하세요.

## 현재 선박 현황 (AIS)
${shipSummary}

## 정박 현황 (Port-MIS 입출항 신고)
${portCallSummary}

## 지역별 혼잡도 (북항/감천/신항 등)
${regionSummary}

## 혼잡도 예측 (시간대별, 0~1)
현재 혼잡도: ${congestion.currentLevel}
${forecastSummary}
${questionSection}
## recommendations 작성 규칙
- 척수·현황 조회처럼 단순 정보 질문이면 recommendations는 빈 배열 []로 두세요. 실제 운항 조치가 필요할 때만 채우세요.
- 채울 때도 서로 다른 선박에 같은 문구를 복사-붙여넣기 하지 마세요. 각 항목은 해당 선박의 상황(속력·ETA·선석 등)에 맞는 별개의 이유여야 합니다.
- 최대 3개까지만 포함하세요. 비슷한 조치가 필요한 선박이 여러 척이면 개별 항목 대신 summary에 몇 척인지 묶어서 설명하세요.

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
