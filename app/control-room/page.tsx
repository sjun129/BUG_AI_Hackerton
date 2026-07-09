"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import LeftRail from "@/frontend/components/LeftRail";
import { useControlRoomBriefing } from "@/frontend/hooks/useControlRoomBriefing";
import type { ControlRoomPriorityTarget, ControlRoomRiskLevel } from "@/frontend/types/control-room";

const text = "#e7ecf5";
const muted = "#8aa0c8";
const panel = "rgba(11,18,34,0.84)";
const border = "1px solid rgba(120,160,255,0.14)";
const cardBg = "linear-gradient(145deg, rgba(15,23,42,.96), rgba(8,13,28,.94))";

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
  if (level === "high") return "#f87171";
  if (level === "medium") return "#fbbf24";
  return "#34d399";
}

function levelColor(level: number): string {
  if (level >= 0.6) return "#f87171";
  if (level >= 0.3) return "#fbbf24";
  return "#34d399";
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <section
      style={{
        background: cardBg,
        border,
        borderRadius: 14,
        boxShadow: "0 18px 50px rgba(0,0,0,.28)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

function StatCard({ label, value, unit, accent }: { label: string; value: string | number; unit?: string; accent?: string }) {
  return (
    <Card style={{ padding: 16, minHeight: 98 }}>
      <div style={{ color: muted, fontSize: 11, fontWeight: 900, letterSpacing: ".08em" }}>{label}</div>
      <div style={{ marginTop: 10, color: accent ?? text, fontSize: 25, fontWeight: 950, lineHeight: 1 }}>
        {value}
        {unit ? <span style={{ marginLeft: 4, color: muted, fontSize: 13 }}>{unit}</span> : null}
      </div>
    </Card>
  );
}

function Pill({ children, color = "#38bdf8" }: { children: ReactNode; color?: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 24,
        padding: "0 9px",
        borderRadius: 999,
        background: `${color}18`,
        border: `1px solid ${color}33`,
        color,
        fontSize: 11,
        fontWeight: 900,
      }}
    >
      {children}
    </span>
  );
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 9px", fontSize: 13, fontWeight: 950 }}>{title}</h3>
      <div style={{ display: "grid", gap: 7 }}>
        {items.length ? (
          items.map((item) => (
            <div key={item} style={{ color: "#cbd5e1", fontSize: 12.5, lineHeight: 1.5 }}>
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
        borderRadius: 12,
        border: "1px solid rgba(148,163,184,.16)",
        background: "rgba(255,255,255,.04)",
      }}
    >
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            background: "linear-gradient(135deg,#2dd4bf,#38bdf8)",
            color: "#04111f",
            fontWeight: 950,
          }}
        >
          {target.rank}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{target.shipName}</div>
          <div style={{ marginTop: 3, color: muted, fontSize: 11.5 }}>{target.destinationPortName ?? "도착지 미확인"}</div>
        </div>
        <Pill color="#2dd4bf">{Math.round(target.priorityScore * 100)}점</Pill>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 10px", marginTop: 12, color: "#cbd5e1", fontSize: 12 }}>
        <span>현재 {target.currentSpeedKn ?? "-"}kn</span>
        <span>권고 {target.recommendedSpeedKn ?? "-"}kn</span>
        <span>대기 {target.metrics.reducedWaitingMinutes}분 감소</span>
        <span>CO2 {formatKg(target.metrics.estimatedCo2ReducedKg)}</span>
      </div>
      <div style={{ marginTop: 10, color: muted, fontSize: 11.5, lineHeight: 1.45 }}>{target.reasonBasis.join(" / ")}</div>
    </article>
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
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 20% 0%, rgba(45,212,191,.16), transparent 28%), radial-gradient(circle at 85% 10%, rgba(59,130,246,.18), transparent 30%), #070c17",
        color: text,
        paddingLeft: 84,
        fontFamily: "Pretendard, system-ui, sans-serif",
      }}
    >
      <LeftRail active="/control-room" />

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "28px 28px 44px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ color: "#2dd4bf", fontSize: 11, fontWeight: 950, letterSpacing: ".14em" }}>AI CONTROL ROOM</div>
            <h1 style={{ margin: "7px 0 0", fontSize: 30, lineHeight: 1.1, fontWeight: 950 }}>AI 관제사 센터</h1>
            <p style={{ margin: "10px 0 0", maxWidth: 760, color: "#cbd5e1", fontSize: 13.5, lineHeight: 1.6 }}>
              실시간 항만 혼잡도, JIT 감속 권고, 경로 추천 계산 결과를 종합해 운영자용 브리핑을 생성합니다.
              본 페이지의 AI 브리핑은 백엔드 계산 결과를 바탕으로 생성한 운영자 검토용 의사결정 지원 정보이며, 실제 항해 지시가 아닙니다.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Pill color={data?.isFallback ? "#fbbf24" : "#2dd4bf"}>{data?.isFallback ? "규칙 기반 fallback" : "OpenAI briefing"}</Pill>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              style={{
                height: 36,
                padding: "0 13px",
                borderRadius: 9,
                border: "1px solid rgba(45,212,191,.3)",
                background: loading ? "rgba(255,255,255,.05)" : "rgba(45,212,191,.13)",
                color: loading ? muted : "#99f6e4",
                fontSize: 12,
                fontWeight: 900,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "갱신 중" : "브리핑 새로고침"}
            </button>
          </div>
        </header>

        {error ? <Card style={{ padding: 16, borderColor: "#f8717155", color: "#fecaca", marginBottom: 16 }}>{error}</Card> : null}
        {loading && !data ? <Card style={{ padding: 20, color: muted }}>AI 관제 브리핑을 불러오는 중입니다.</Card> : null}

        {data ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 12, marginBottom: 14 }}>
              <StatCard
                label="최대 혼잡 항만"
                value={mostCongestedPort ? `${Math.round(mostCongestedPort.congestionLevel * 100)}%` : "-"}
                unit={mostCongestedPort?.name}
                accent={mostCongestedPort ? levelColor(mostCongestedPort.congestionLevel) : undefined}
              />
              <StatCard label="JIT 권고 대상" value={data.snapshot.energy.recommendedCount} unit="척" accent="#38bdf8" />
              <StatCard label="총 대기 감소" value={data.snapshot.energy.totalReducedWaitingMinutes} unit="분" accent="#2dd4bf" />
              <StatCard label="총 연료 절감" value={formatKg(data.snapshot.energy.totalEstimatedFuelSavedKg)} accent="#34d399" />
              <StatCard label="총 CO2 감축" value={formatKg(data.snapshot.energy.totalEstimatedCo2ReducedKg)} accent="#fbbf24" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(340px, .75fr)", gap: 14, alignItems: "start" }}>
              <div style={{ display: "grid", gap: 14 }}>
                <Card style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
                    <div>
                      <div style={{ color: "#2dd4bf", fontSize: 11, fontWeight: 950, letterSpacing: ".1em" }}>AI PORT BRIEFING</div>
                      <h2 style={{ margin: "6px 0 0", fontSize: 20, fontWeight: 950 }}>{briefing?.headline}</h2>
                    </div>
                    <Pill color={riskColor(risk)}>risk {risk}</Pill>
                  </div>
                  <p style={{ margin: "0 0 16px", color: "#dbeafe", fontSize: 14, lineHeight: 1.65 }}>{briefing?.summary}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <ListBlock title="혼잡 원인" items={briefing?.congestionCauses ?? []} />
                    <ListBlock title="우선 조치 방향" items={briefing?.priorityActions ?? []} />
                  </div>
                </Card>

                <Card style={{ padding: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", marginBottom: 14 }}>
                    <div>
                      <div style={{ color: "#38bdf8", fontSize: 11, fontWeight: 950, letterSpacing: ".1em" }}>PRIORITY VESSELS</div>
                      <h2 style={{ margin: "6px 0 0", fontSize: 19, fontWeight: 950 }}>AI 우선 조치 대상 선박</h2>
                    </div>
                    <span style={{ color: muted, fontSize: 12 }}>백엔드 우선순위 고정</span>
                  </div>
                  {data.priorityTargets.length ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                      {data.priorityTargets.map((target) => (
                        <PriorityTargetCard key={`${target.rank}-${target.shipName}`} target={target} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: muted, fontSize: 13, lineHeight: 1.6 }}>현재 JIT 감속 권고 대상 선박이 없습니다.</div>
                  )}
                </Card>

                <Card style={{ padding: 18 }}>
                  <div style={{ color: "#a78bfa", fontSize: 11, fontWeight: 950, letterSpacing: ".1em" }}>ROUTE SCENARIO REPORT</div>
                  <h2 style={{ margin: "6px 0 10px", fontSize: 19, fontWeight: 950 }}>AI 시나리오/경로 리포트</h2>
                  <p style={{ margin: 0, color: "#cbd5e1", fontSize: 13, lineHeight: 1.6 }}>
                    {briefing?.routeScenarioSummary ?? "시뮬레이션 결과가 아직 없습니다."}
                  </p>
                  <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(data.snapshot.routeScenario?.highlights ?? []).map((item) => (
                      <Pill key={item} color="#a78bfa">
                        {item}
                      </Pill>
                    ))}
                  </div>
                </Card>
              </div>

              <div style={{ display: "grid", gap: 14 }}>
                <Card style={{ padding: 16, background: panel }}>
                  <div style={{ color: muted, fontSize: 11, fontWeight: 950, letterSpacing: ".1em" }}>DATA STATUS</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 10, color: "#cbd5e1", fontSize: 12.5 }}>
                    <div>마지막 갱신: {formatDateTime(data.lastUpdated)}</div>
                    <div>선박: 총 {data.snapshot.ships.total}척 / 항해중 {data.snapshot.ships.underway}척 / 정박 {data.snapshot.ships.anchored}척</div>
                    <div>계산 기준: {data.basis}</div>
                  </div>
                </Card>

                <Card style={{ padding: 16 }}>
                  <div style={{ color: "#2dd4bf", fontSize: 11, fontWeight: 950, letterSpacing: ".1em" }}>PORT SNAPSHOT</div>
                  <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
                    {data.snapshot.ports.map((port) => (
                      <div key={port.id} style={{ padding: 11, borderRadius: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(148,163,184,.13)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                          <strong>{port.name}</strong>
                          <span style={{ color: levelColor(port.congestionLevel), fontWeight: 950 }}>{Math.round(port.congestionLevel * 100)}%</span>
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

                <Card style={{ padding: 16, borderColor: "#fbbf2450", background: "rgba(113,63,18,.18)" }}>
                  <div style={{ color: "#fde68a", fontSize: 12.5, fontWeight: 900, lineHeight: 1.55 }}>
                    {briefing?.disclaimer}
                  </div>
                  <div style={{ marginTop: 10, color: "#fef3c7", fontSize: 11.5, lineHeight: 1.5 }}>{data.calculationNote}</div>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}
