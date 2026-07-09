# backend/advisor

LLM 어드바이저 에이전트의 프롬프트 생성과 응답 파싱을 담당한다. `generateText` 호출 자체는
`app/api/advisor/route.ts`에서 하고, 이 폴더는 순수 함수만 제공한다.

- `prompt.ts` — `Ship[]`·`CongestionForecast`·`PortCall[]`(정박 현황)·`RegionCongestionSeries[]`(지역별
  혼잡도)를 사람이 읽는 요약 + JSON 스키마 지시문으로 변환한다(`buildAdvisorPrompt`). 대시보드에 보이는
  사이트 데이터를 그대로 넘겨, 운영자가 자유롭게 질문해도(정박 척수, 지역별 혼잡도 등) 실제 데이터에
  근거해 답하게 한다.
- `parse.ts` — LLM 텍스트 응답을 `AdvisorResult`로 안전하게 파싱한다(`parseAdvisorResult`).
  코드펜스 제거, JSON 부분 추출, 스키마 검증을 거치며 실패 시 표시 가능한 기본값을 반환한다.
  **LLM 출력은 신뢰하지 않는다 — route에서 직접 `JSON.parse`하지 말고 항상 이 함수를 거친다.**
