// LLM 응답은 신뢰할 수 없는 입력이다 — 코드펜스가 섞이거나 스키마를 벗어날 수 있으므로
// 항상 이 함수를 거쳐 안전하게 파싱하고, 실패 시 표시 가능한 기본값으로 대체한다.

import type { AdvisorResult } from "../ports/port-types";

const FALLBACK: AdvisorResult = {
  summary: "LLM 응답을 해석할 수 없어 기본 안내를 표시합니다. 혼잡도 차트와 선박 목록을 참고해주세요.",
  recommendations: [],
  peakTime: new Date().toISOString(),
};

function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1);
  }
  return text.trim();
}

function isValidResult(value: unknown): value is AdvisorResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.summary !== "string" || typeof v.peakTime !== "string") return false;
  if (!Array.isArray(v.recommendations)) return false;

  return v.recommendations.every((r) => {
    if (typeof r !== "object" || r === null) return false;
    const rec = r as Record<string, unknown>;
    return (
      typeof rec.mmsi === "string" && typeof rec.action === "string" && typeof rec.reason === "string"
    );
  });
}

export function parseAdvisorResult(rawText: string): AdvisorResult {
  try {
    const parsed = JSON.parse(extractJson(rawText));
    return isValidResult(parsed) ? parsed : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
