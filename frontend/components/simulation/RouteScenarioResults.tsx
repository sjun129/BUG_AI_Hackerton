"use client";

import type { RouteScenarioResponse } from "@/frontend/types/route-scenario";
import type { ScenarioShipSource } from "@/frontend/types/simulation";

const text = "#e7ecf5";
const muted = "#8aa0c8";

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatKg(value: number): string {
  return `${Math.round(value).toLocaleString("ko-KR")}kg`;
}

function formatScore(value: number): string {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 2 });
}

function SimBadge({ source = "manual" }: { source?: ScenarioShipSource }) {
  const snapshot = source === "ais-snapshot";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        height: 20,
        padding: "0 7px",
        borderRadius: 6,
        background: snapshot ? "rgba(59,130,246,.18)" : "rgba(250,204,21,.16)",
        color: snapshot ? "#bfdbfe" : "#fde68a",
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: ".06em",
      }}
    >
      {snapshot ? "LIVE SNAPSHOT" : "SIM"}
    </span>
  );
}

export default function RouteScenarioResults({ result }: { result: RouteScenarioResponse | null }) {
  if (!result) {
    return (
      <div style={{ color: muted, fontSize: 12.5, lineHeight: 1.6 }}>
        경로 추천 계산 후 도착지별 사전 정의 접근 경로 후보의 거리, ETA, 혼잡도, 예상 대기, 연료와 CO₂ 비교가 여기에 표시됩니다.
      </div>
    );
  }

  if (result.summary.recommendedCount === 0) {
    return (
      <div style={{ color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.6 }}>
        <strong style={{ color: text }}>현재 시나리오 기준으로 추천 가능한 접근 경로 후보가 없습니다.</strong>
        <br />
        {result.validation?.rejectedCount ? `입력 검증에서 ${result.validation.rejectedCount}척이 제외되었습니다.` : "선박 입력값과 도착지를 확인해주세요."}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflowY: "auto", paddingRight: 2 }}>
      <div style={{ borderRadius: 8, border: "1px solid rgba(34,197,94,.18)", background: "rgba(34,197,94,.08)", padding: 10, color: "#bbf7d0", fontSize: 12, lineHeight: 1.5 }}>
        계산 기준: 사전 정의 접근 경로 후보 비교 · 추천 {result.summary.recommendedCount}척 / 입력 {result.summary.shipCount}척
        <br />
        {result.calculationNote}
      </div>

      {result.results.map((shipResult) => {
        const recommended = shipResult.routeScenarios.find((scenario) => scenario.isRecommended);
        return (
          <article key={shipResult.shipId ?? shipResult.shipName} style={{ borderRadius: 10, border: "1px solid rgba(148,163,184,.14)", background: "rgba(255,255,255,.035)", padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <SimBadge source={shipResult.scenarioSource} />
              <div style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {shipResult.shipName}
              </div>
              {recommended && <span style={{ color: "#bbf7d0", fontSize: 10.5, fontWeight: 900 }}>추천 #{recommended.rank}</span>}
            </div>

            <p style={{ margin: "9px 0 0", color: "#cbd5e1", fontSize: 11.5, lineHeight: 1.5 }}>
              {shipResult.destinationPortName} 기준으로 {shipResult.recommendedRouteName ?? "-"} 후보가 가장 낮은 MVP 가중 비교 점수를 기록했습니다.
            </p>

            {recommended && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px", marginTop: 10, color: "#cbd5e1", fontSize: 12 }}>
                <span>추천 경로 {recommended.routeShortName}</span>
                <span>거리 {recommended.distanceNm}NM</span>
                <span>ETA {formatDateTime(recommended.eta)}</span>
                <span>혼잡 {Math.round(recommended.congestionLevel * 100)}% · {recommended.congestionStatus}</span>
                <span>예상 대기 {recommended.estimatedWaitingMinutes}분</span>
                <span>권고 속도 {recommended.recommendedSpeedKn}kn</span>
                <span>연료 절감 {formatKg(recommended.estimatedFuelSavedKg)}</span>
                <span>CO₂ 감축 {formatKg(recommended.estimatedCo2ReducedKg)}</span>
                <span>예상 연료 {formatKg(recommended.estimatedFuelKg)}</span>
                <span>점수 {formatScore(recommended.score)}</span>
              </div>
            )}

            {recommended?.reasons.slice(0, 3).map((reason) => (
              <div key={reason} style={{ marginTop: 7, color: muted, fontSize: 10.5, lineHeight: 1.35 }}>
                {reason}
              </div>
            ))}

            <div style={{ marginTop: 12, overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560, color: "#cbd5e1", fontSize: 11 }}>
                <thead>
                  <tr style={{ color: muted, textAlign: "left" }}>
                    <th style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.14)" }}>순위</th>
                    <th style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.14)" }}>경로</th>
                    <th style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.14)" }}>거리</th>
                    <th style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.14)" }}>대기</th>
                    <th style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.14)" }}>연료 절감</th>
                    <th style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.14)" }}>CO₂ 감축</th>
                    <th style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.14)" }}>점수</th>
                  </tr>
                </thead>
                <tbody>
                  {shipResult.routeScenarios.map((scenario) => (
                    <tr key={scenario.routeId} style={{ color: scenario.isRecommended ? "#bbf7d0" : "#cbd5e1" }}>
                      <td style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.08)", fontWeight: 900 }}>
                        {scenario.rank}{scenario.isRecommended ? " · 추천" : ""}
                      </td>
                      <td style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.08)" }}>{scenario.routeShortName}</td>
                      <td style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.08)" }}>{scenario.distanceNm}NM</td>
                      <td style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.08)" }}>{scenario.estimatedWaitingMinutes}분</td>
                      <td style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.08)" }}>{formatKg(scenario.estimatedFuelSavedKg)}</td>
                      <td style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.08)" }}>{formatKg(scenario.estimatedCo2ReducedKg)}</td>
                      <td style={{ padding: "7px 6px", borderBottom: "1px solid rgba(148,163,184,.08)" }}>{formatScore(scenario.score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(recommended?.warnings ?? shipResult.warnings).slice(0, 2).map((warning) => (
              <div key={warning} style={{ marginTop: 8, color: "#fde68a", fontSize: 10.5, lineHeight: 1.35 }}>
                {warning}
              </div>
            ))}
          </article>
        );
      })}
    </div>
  );
}
