"use client";

import { useState } from "react";
import type { AdvisorResult } from "@/backend/ports/port-types";

export default function AdvisorPanel() {
  const [result, setResult] = useState<AdvisorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function requestAdvice() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/advisor", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "요청 처리 중 오류가 발생했습니다.");
        return;
      }
      setResult(data as AdvisorResult);
    } catch {
      setError("서버에 연결할 수 없습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={requestAdvice}
        disabled={loading}
        className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-bg)] transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "분석 중..." : "AI 운영 권고 요청"}
      </button>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-[var(--color-ink-soft)]">{result.summary}</p>
          <p>
            예상 최혼잡 시각:{" "}
            <span className="font-medium">{new Date(result.peakTime).toLocaleString("ko-KR")}</span>
          </p>
          {result.recommendations.length > 0 && (
            <ul className="space-y-2">
              {result.recommendations.map((rec, i) => (
                <li key={`${rec.mmsi}-${i}`} className="rounded-lg border border-white/10 p-3">
                  <p className="font-medium">MMSI {rec.mmsi}</p>
                  <p className="text-[var(--color-ink-soft)]">{rec.action}</p>
                  <p className="mt-1 text-xs text-[var(--color-ink-soft)]">{rec.reason}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
