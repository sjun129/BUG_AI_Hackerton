"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import LeftRail from "@/frontend/components/LeftRail";
import { LT } from "@/frontend/components/theme";
import { useControlRoomBriefing } from "@/frontend/hooks/useControlRoomBriefing";
import type { ControlRoomPriorityTarget, ControlRoomRiskLevel } from "@/frontend/types/control-room";

const muted = LT.muted;
const panel = LT.panelSolid;
const border = LT.border;
const ink = LT.ink;

function formatDateTime(iso: string | undefined): string {
  if (!iso) return "-";
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

function riskColor(level: ControlRoomRiskLevel): string {
  if (level === "high") return LT.red;
  if (level === "medium") return LT.amber;
  return LT.green;
}

function levelColor(level: number): string {
  if (level >= 0.6) return LT.red;
  if (level >= 0.3) return LT.amber;
  return LT.green;
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <section
      style={{
        background: panel,
        border,
        borderRadius: 16,
        boxShadow: LT.shadow,
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function Pill({ children, tone = "blue" }: { children: ReactNode; tone?: "blue" | "green" | "amber" | "red" | "slate" }) {
  const map = {
    blue: { color: LT.blue, bg: LT.blueSoft },
    green: { color: LT.green, bg: "rgba(22,163,74,.12)" },
    amber: { color: "#b45309", bg: "rgba(232,149,43,.14)" },
    red: { color: LT.red, bg: "rgba(239,68,68,.10)" },
    slate: { color: LT.inkSoft, bg: LT.tile },
  }[tone];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 24,
        padding: "0 9px",
        borderRadius: 999,
        background: map.bg,
        color: map.color,
        fontSize: 11,
        fontWeight: 800,
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </span>
  );
}

function StatCard({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <Card style={{ padding: "16px 18px", minHeight: 104 }}>
      <div style={{ color: muted, fontSize: 11, fontWeight: 800, letterSpacing: ".06em" }}>{label}</div>
      <div style={{ marginTop: 12, color: accent ?? ink, fontSize: 26, fontWeight: 900, lineHeight: 1 }}>
        {value}
        {unit ? <span style={{ marginLeft: 4, color: muted, fontSize: 12.5, fontWeight: 700 }}>{unit}</span> : null}
      </div>
    </Card>
  );
}

function SectionTitle({ eyebrow, title, right }: { eyebrow: string; title: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
      <div>
        <div style={{ color: LT.blue, fontSize: 11, fontWeight: 900, letterSpacing: ".1em" }}>{eyebrow}</div>
        <h2 style={{ margin: "6px 0 0", color: ink, fontSize: 19, fontWeight: 900, letterSpacing: "-.01em" }}>{title}</h2>
      </div>
      {right}
    </div>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 9px", color: ink, fontSize: 13, fontWeight: 900 }}>{title}</h3>
      <div style={{ display: "grid", gap: 7 }}>
        {items.length ? (
          items.map((item) => (
            <div key={item} style={{ color: LT.inkSoft, fontSize: 12.5, lineHeight: 1.55 }}>
              {item}
            </div>
          ))
        ) : (
          <div style={{ color: muted, fontSize: 12.5 }}>표시할 항목이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function PriorityTargetCard({ target }: { target: ControlRoomPriorityTarget }) {
  return (
    <article
      style={{
        padding: 14,
        borderRadius: 14,
        border,
        background: "#fff",
      }}
    >
      <div style={{ display: "flex", gap: 11, alignItems: "center" }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg,#2f6bff,#5b8cff)",
            color: "#fff",
            fontWeight: 900,
            boxShadow: "0 6px 16px rgba(47,107,255,.28)",
          }}
        >
          {target.rank}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ color: ink, fontSize: 14, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {target.shipName}
          </div>
          <div style={{ marginTop: 3, color: muted, fontSize: 11.5 }}>{target.destinationPortName ?? "도착지 미확인"}</div>
        </div>
        <Pill tone="blue">{Math.round(target.priorityScore * 100)}점</Pill>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
        <Metric label="현재 속도" value={target.currentSpeedKn ?? "-"} unit="kn" />
        <Metric label="권고 속도" value={target.recommendedSpeedKn ?? "-"} unit="kn" />
        <Metric label="대기 감소" value={target.metrics.reducedWaitingMinutes} unit="분" tone="green" />
        <Metric label="CO2 감축" value={formatKg(target.metrics.estimatedCo2ReducedKg)} tone="green" />
      </div>
      <div style={{ marginTop: 10, color: muted, fontSize: 11.5, lineHeight: 1.45 }}>{target.reasonBasis.join(" / ")}</div>
    </article>
  );
}

function Metric({ label, value, unit, tone = "neutral" }: { label: string; value: ReactNode; unit?: string; tone?: "neutral" | "green" }) {
  const green = tone === "green";
  return (
    <div style={{ borderRadius: 11, background: green ? "rgba(22,163,74,.09)" : LT.tile, padding: "10px 11px" }}>
      <div style={{ color: green ? "rgba(22,163,74,.82)" : muted, fontSize: 10.5, fontWeight: 800 }}>{label}</div>
      <div style={{ marginTop: 4, color: green ? LT.green : ink, fontSize: 15, fontWeight: 900, lineHeight: 1 }}>
        {value}
        {unit ? <span style={{ marginLeft: 3, color: green ? "rgba(22,163,74,.75)" : muted, fontSize: 10.5 }}>{unit}</span> : null}
      </div>
    </div>
  );
}

export default function ControlRoomPage() {
  const { data, loading, error, refresh } = useControlRoomBriefing();
  const mostCongestedPort = useMemo(() => {
    if (!data?.snapshot.ports.length) return null;
    return [...data.snapshot.ports].sort((a, b) => b.congestionLevel - a.congestionLevel)[0];
  }, [data]);

  const briefing = data?.briefing;
  const risk = briefing?.riskLevel ?? "low";

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: LT.pageBg, color: ink, paddingLeft: 84, fontFamily: "Pretendard, system-ui, sans-serif" }}>
      <LeftRail active="/control-room" />

      <main style={{ maxWidth: 1260, margin: "0 auto", padding: "28px 28px 44px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            alignItems: "flex-start",
            marginBottom: 18,
            padding: "18px 20px",
            background: panel,
            border,
            borderRadius: 16,
            boxShadow: LT.shadow,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: LT.blue, fontSize: 11, fontWeight: 900, letterSpacing: ".14em" }}>AI CONTROL ROOM</div>
            <h1 style={{ margin: "7px 0 0", fontSize: 28, lineHeight: 1.1, fontWeight: 900, letterSpacing: "-.02em" }}>AI 관제사 센터</h1>
            <p style={{ margin: "10px 0 0", maxWidth: 760, color: LT.inkSoft, fontSize: 13.5, lineHeight: 1.6 }}>
              실시간 항만 혼잡도, JIT 감속 권고, 경로 추천 계산 결과를 종합해 운영자 검토용 브리핑을 생성합니다. AI는 백엔드 계산
              결과를 설명하며 실제 항해 지시를 생성하지 않습니다.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Pill tone={data?.isFallback ? "amber" : "green"}>{data?.isFallback ? "규칙 기반 fallback" : "OpenAI briefing"}</Pill>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              style={{
                height: 38,
                padding: "0 14px",
                borderRadius: 10,
                border: "none",
                background: loading ? "#cbd5e1" : LT.blue,
                color: "#fff",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: loading ? "wait" : "pointer",
                boxShadow: loading ? "none" : "0 6px 16px rgba(37,99,235,.28)",
              }}
            >
              {loading ? "갱신 중" : "브리핑 새로고침"}
            </button>
          </div>
        </header>

        {error ? <Card style={{ padding: 16, borderColor: "rgba(239,68,68,0.35)", color: LT.red, marginBottom: 16 }}>{error}</Card> : null}
        {loading && !data ? <Card style={{ padding: 20, color: muted }}>AI 관제 브리핑을 불러오는 중입니다.</Card> : null}

        {data ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(185px, 1fr))", gap: 12, marginBottom: 14 }}>
              <StatCard
                label="최대 혼잡 항만"
                value={mostCongestedPort ? `${Math.round(mostCongestedPort.congestionLevel * 100)}%` : "-"}
                unit={mostCongestedPort?.name}
                accent={mostCongestedPort ? levelColor(mostCongestedPort.congestionLevel) : undefined}
              />
              <StatCard label="JIT 권고 대상" value={data.snapshot.energy.recommendedCount} unit="척" accent={LT.blue} />
              <StatCard label="총 대기 감소" value={data.snapshot.energy.totalReducedWaitingMinutes} unit="분" accent={LT.green} />
              <StatCard label="총 연료 절감" value={formatKg(data.snapshot.energy.totalEstimatedFuelSavedKg)} accent={LT.green} />
              <StatCard label="총 CO2 감축" value={formatKg(data.snapshot.energy.totalEstimatedCo2ReducedKg)} accent={LT.amber} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 14 }}>
                <Card style={{ padding: 18 }}>
                  <SectionTitle eyebrow="AI PORT BRIEFING" title={briefing?.headline ?? "운영 브리핑"} right={<Pill tone={risk === "high" ? "red" : risk === "medium" ? "amber" : "green"}>risk {risk}</Pill>} />
                  <p style={{ margin: "0 0 16px", color: LT.inkSoft, fontSize: 14, lineHeight: 1.65 }}>{briefing?.summary}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
                    <ListBlock title="혼잡 원인" items={briefing?.congestionCauses ?? []} />
                    <ListBlock title="우선 조치 방향" items={briefing?.priorityActions ?? []} />
                  </div>
                </Card>

                <Card style={{ padding: 18 }}>
                  <SectionTitle eyebrow="PRIORITY VESSELS" title="AI 우선 조치 대상 선박" right={<span style={{ color: muted, fontSize: 12, fontWeight: 700 }}>백엔드 우선순위 고정</span>} />
                  {data.priorityTargets.length ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                      {data.priorityTargets.map((target) => (
                        <PriorityTargetCard key={`${target.rank}-${target.shipName}`} target={target} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: muted, fontSize: 13, lineHeight: 1.6 }}>현재 JIT 감속 권고 대상 선박이 없습니다.</div>
                  )}
                </Card>

                <Card style={{ padding: 18 }}>
                  <SectionTitle eyebrow="ROUTE SCENARIO REPORT" title="AI 시나리오/경로 리포트" />
                  <p style={{ margin: 0, color: LT.inkSoft, fontSize: 13, lineHeight: 1.6 }}>
                    {briefing?.routeScenarioSummary ?? "시뮬레이션 결과가 아직 없습니다."}
                  </p>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(data.snapshot.routeScenario?.highlights ?? []).map((item) => (
                      <Pill key={item} tone="slate">
                        {item}
                      </Pill>
                    ))}
                  </div>
                </Card>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <Card style={{ padding: 16 }}>
                  <SectionTitle eyebrow="DATA STATUS" title="데이터 상태" />
                  <div style={{ display: "grid", gap: 10, color: LT.inkSoft, fontSize: 12.5 }}>
                    <div>마지막 갱신: {formatDateTime(data.lastUpdated)}</div>
                    <div>
                      선박: 총 {data.snapshot.ships.total}척 / 항해중 {data.snapshot.ships.underway}척 / 정박 {data.snapshot.ships.anchored}척
                    </div>
                    <div>계산 기준: {data.basis}</div>
                  </div>
                </Card>

                <Card style={{ padding: 16 }}>
                  <SectionTitle eyebrow="PORT SNAPSHOT" title="항만별 현황" />
                  <div style={{ display: "grid", gap: 9 }}>
                    {data.snapshot.ports.map((port) => (
                      <div key={port.id} style={{ padding: 12, borderRadius: 12, background: LT.tile, border: "1px solid rgba(15,23,42,0.04)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <strong style={{ color: ink }}>{port.name}</strong>
                          <span style={{ color: levelColor(port.congestionLevel), fontWeight: 900 }}>{Math.round(port.congestionLevel * 100)}%</span>
                        </div>
                        <div style={{ marginTop: 6, color: muted, fontSize: 11.5 }}>
                          {port.congestionStatus} / 입항 {port.arrivingCount ?? "-"}건 / 현황 {port.waitingOrAnchoredCount ?? "-"}척
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card style={{ padding: 16 }}>
                  <ListBlock title="운영 리스크" items={briefing?.risks ?? []} />
                  <div style={{ height: 14 }} />
                  <ListBlock title="다음 검토" items={briefing?.nextSteps ?? []} />
                </Card>

                <Card style={{ padding: 16, borderColor: "rgba(232,149,43,.24)", background: "rgba(255,255,255,.96)" }}>
                  <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderRadius: 12, background: "rgba(232,149,43,.10)", color: "#9a6a12", fontSize: 12.5, fontWeight: 700, lineHeight: 1.55 }}>
                    <span>주의</span>
                    <span>{briefing?.disclaimer}</span>
                  </div>
                  <div style={{ marginTop: 10, color: muted, fontSize: 11.5, lineHeight: 1.5 }}>{data.calculationNote}</div>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
