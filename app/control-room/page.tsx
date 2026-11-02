"use client";

import { useMemo, type CSSProperties, type ReactNode } from "react";
import LeftRail, { RAIL_OFFSET } from "@/frontend/components/LeftRail";
import { LT } from "@/frontend/components/theme";
import { useControlRoomBriefing } from "@/frontend/hooks/useControlRoomBriefing";
import type { ControlRoomPriorityTarget, ControlRoomRiskLevel } from "@/frontend/types/control-room";

const muted = LT.muted;
const panel = LT.panelSolid;
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

function formatKg(value: number): { value: string; unit: string } {
  if (value >= 1000) return { value: (value / 1000).toFixed(1), unit: "t" };
  return { value: Math.round(value).toLocaleString("ko-KR"), unit: "kg" };
}

const RISK_LABEL: Record<ControlRoomRiskLevel, string> = { high: "위험 높음", medium: "위험 보통", low: "위험 낮음" };

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
  return <section style={{ background: panel, borderRadius: 18, boxShadow: LT.shadow, padding: 20, ...style }}>{children}</section>;
}

function CardHead({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <span style={{ fontSize: 15, fontWeight: 800, color: ink }}>{title}</span>
      {right}
    </div>
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
    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 9px", borderRadius: 999, background: map.bg, color: map.color, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function StatTile({ label, value, unit, caption, accent }: { label: string; value: string | number; unit?: string; caption?: string; accent?: string }) {
  return (
    <Card style={{ padding: "16px 18px", flex: 1, minWidth: 0 }}>
      <div style={{ color: muted, fontSize: 12, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 4, color: accent ?? ink, fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
        {value}
        {unit ? <span style={{ marginLeft: 4, color: muted, fontSize: 12, fontWeight: 600 }}>{unit}</span> : null}
      </div>
      {caption && <div style={{ marginTop: 2, color: muted, fontSize: 11 }}>{caption}</div>}
    </Card>
  );
}

function NumberedBox({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div style={{ flex: 1, minWidth: 240, borderRadius: 12, background: tone, padding: "14px 16px" }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: ink, marginBottom: 8 }}>{title}</div>
      {items.length ? (
        items.map((item, i) => (
          <div key={item} style={{ display: "flex", gap: 8, fontSize: 13, color: LT.inkSoft, lineHeight: 1.55, marginTop: i ? 4 : 0 }}>
            <b style={{ color: LT.blue, fontSize: 12 }}>{i + 1}</b>
            <span>{item}</span>
          </div>
        ))
      ) : (
        <div style={{ color: muted, fontSize: 12.5 }}>표시할 항목이 없습니다.</div>
      )}
    </div>
  );
}

// 우선 조치 대상 표의 열: [제목, 폭(px, 0이면 남는 폭)]
const COLS: [string, number][] = [
  ["순위", 52],
  ["선박", 0],
  ["도착지", 120],
  ["현재 → 권고 속도", 160],
  ["대기 감소", 100],
  ["CO₂ 감축", 100],
  ["점수", 64],
];

function PriorityRow({ t }: { t: ControlRoomPriorityTarget }) {
  const co2 = formatKg(t.metrics.estimatedCo2ReducedKg);
  const cells: ReactNode[] = [
    <span key="r" style={{ width: 26, height: 26, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: t.rank <= 3 ? LT.blue : LT.tile, color: t.rank <= 3 ? "#fff" : LT.inkSoft }}>
      {t.rank}
    </span>,
    <b key="n" style={{ fontSize: 14, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={t.reasonBasis.join(" / ")}>
      {t.shipName}
    </b>,
    <span key="d" style={{ fontSize: 13, fontWeight: 700 }}>{t.destinationPortName ?? "미확인"}</span>,
    <span key="s" style={{ fontSize: 13 }}>
      <span style={{ color: muted }}>{t.currentSpeedKn ?? "-"}kn → </span>
      <b style={{ color: LT.blue }}>{t.recommendedSpeedKn ?? "-"}kn</b>
    </span>,
    <b key="w" style={{ fontSize: 14, color: LT.green }}>{t.metrics.reducedWaitingMinutes}분</b>,
    <b key="c" style={{ fontSize: 14, color: LT.green }}>
      {co2.value}
      {co2.unit}
    </b>,
    <Pill key="p" tone="blue">{Math.round(t.priorityScore * 100)}</Pill>,
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: `1px solid ${LT.borderColor}` }}>
      {cells.map((c, i) => (
        <div key={i} style={COLS[i][1] ? { width: COLS[i][1], flex: "none" } : { flex: 1, minWidth: 0, display: "flex" }}>
          {c}
        </div>
      ))}
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
  const fuel = formatKg(data?.snapshot.energy.totalEstimatedFuelSavedKg ?? 0);
  const co2 = formatKg(data?.snapshot.energy.totalEstimatedCo2ReducedKg ?? 0);
  const alerts = data?.snapshot.collisionRisk.topAlerts ?? [];

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: LT.pageBg, color: ink, paddingLeft: RAIL_OFFSET, fontFamily: "Pretendard, system-ui, sans-serif" }}>
      <LeftRail active="/control-room" />

      <main style={{ padding: "16px 24px 24px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* 헤더 */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 18 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: "-.01em" }}>AI 관제사 센터</h1>
              <Pill tone={data?.isFallback ? "amber" : "green"}>{data?.isFallback ? "규칙 기반 브리핑" : "OpenAI 브리핑"}</Pill>
            </div>
            <p style={{ margin: "2px 0 0", color: muted, fontSize: 13 }}>혼잡도 · JIT 감속 권고 · 충돌 위험 계산 결과를 AI가 요약한 운영자 검토용 브리핑입니다.</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flex: "none" }}>
            <span style={{ color: muted, fontSize: 12, fontWeight: 600 }}>마지막 갱신 {formatDateTime(data?.lastUpdated)}</span>
            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              style={{ height: 38, padding: "0 16px", borderRadius: 10, border: "none", background: loading ? "#cbd5e1" : LT.blue, color: "#fff", fontSize: 13, fontWeight: 800, fontFamily: "inherit", cursor: loading ? "wait" : "pointer" }}
            >
              {loading ? "갱신 중" : "↻ 브리핑 새로고침"}
            </button>
          </div>
        </header>

        {error ? <Card style={{ color: LT.red }}>{error}</Card> : null}
        {loading && !data ? <Card style={{ color: muted }}>AI 관제 브리핑을 불러오는 중입니다.</Card> : null}

        {data ? (
          <>
            {/* 핵심 지표 */}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <StatTile
                label="가장 혼잡한 항만"
                value={mostCongestedPort ? `${Math.round(mostCongestedPort.congestionLevel * 100)}` : "-"}
                unit={mostCongestedPort ? `% · ${mostCongestedPort.name}` : undefined}
                caption={mostCongestedPort?.congestionStatus}
                accent={mostCongestedPort ? levelColor(mostCongestedPort.congestionLevel) : undefined}
              />
              <StatTile label="JIT 감속 권고 대상" value={data.snapshot.energy.recommendedCount} unit="척" caption="항해 중 접근 선박" />
              <StatTile label="예상 대기 감소" value={data.snapshot.energy.totalReducedWaitingMinutes.toLocaleString("ko-KR")} unit="분" caption="권고 이행 시 합계" accent={LT.blue} />
              <StatTile label="예상 연료 절감" value={fuel.value} unit={fuel.unit} caption="권고 이행 시 합계" accent={LT.green} />
              <StatTile label="예상 CO₂ 감축" value={co2.value} unit={co2.unit} caption="권고 이행 시 합계" accent={LT.green} />
            </div>

            <div style={{ display: "flex", gap: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
              {/* 왼쪽: 브리핑 + 우선 조치 선박 */}
              <div style={{ flex: "1 1 640px", minWidth: 0, display: "flex", flexDirection: "column", gap: 18 }}>
                <Card style={{ borderLeft: `5px solid ${riskColor(risk)}`, paddingLeft: 24 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Pill tone={risk === "high" ? "red" : risk === "medium" ? "amber" : "green"}>● {RISK_LABEL[risk]}</Pill>
                    <span style={{ color: muted, fontSize: 12, fontWeight: 600 }}>AI 항만 브리핑 · {formatDateTime(data.lastUpdated)} 기준</span>
                  </div>
                  <h2 style={{ margin: "12px 0 6px", fontSize: 20, fontWeight: 800, letterSpacing: "-.01em" }}>{briefing?.headline ?? "운영 브리핑"}</h2>
                  <p style={{ margin: "0 0 14px", color: LT.inkSoft, fontSize: 14, lineHeight: 1.65 }}>{briefing?.summary}</p>
                  <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                    <NumberedBox title="혼잡 원인" items={briefing?.congestionCauses ?? []} tone={LT.tile} />
                    <NumberedBox title="우선 조치" items={briefing?.priorityActions ?? []} tone={LT.blueSoft} />
                  </div>
                </Card>

                <Card>
                  <CardHead title="AI 우선 조치 대상 선박" right={<Pill tone="slate">백엔드 우선순위 기준</Pill>} />
                  {data.priorityTargets.length ? (
                    <div>
                      <div style={{ display: "flex", padding: "8px 12px", borderRadius: 10, background: LT.tile }}>
                        {COLS.map(([t, w]) => (
                          <div key={t} style={w ? { width: w, flex: "none" } : { flex: 1 }}>
                            <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>{t}</span>
                          </div>
                        ))}
                      </div>
                      {data.priorityTargets.map((t) => (
                        <PriorityRow key={`${t.rank}-${t.shipName}`} t={t} />
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: muted, fontSize: 13 }}>현재 JIT 감속 권고 대상 선박이 없습니다.</div>
                  )}
                </Card>

                {briefing?.routeScenarioSummary && (
                  <Card>
                    <CardHead title="AI 시나리오 · 경로 리포트" />
                    <p style={{ margin: 0, color: LT.inkSoft, fontSize: 13, lineHeight: 1.6 }}>{briefing.routeScenarioSummary}</p>
                  </Card>
                )}
              </div>

              {/* 오른쪽: 충돌 위험 · 항만별 현황 · 데이터 상태 */}
              <div style={{ flex: "0 1 520px", minWidth: 360, display: "flex", flexDirection: "column", gap: 18 }}>
                <Card>
                  <CardHead
                    title="근접 충돌 위험"
                    right={<Pill tone={data.snapshot.collisionRisk.dangerCount > 0 ? "red" : "green"}>{data.snapshot.collisionRisk.totalAlerts}쌍</Pill>}
                  />
                  {alerts.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {alerts.map((a) => {
                        const tone = a.risk === "danger" ? LT.red : LT.amber;
                        return (
                          <div key={`${a.aName}-${a.bName}`} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "10px 12px", borderRadius: 10, background: LT.tile }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                              <span style={{ width: 8, height: 8, flex: "none", borderRadius: 4, background: tone }} />
                              <b style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {a.aName} ↔ {a.bName}
                              </b>
                            </span>
                            <span style={{ display: "flex", gap: 12, flex: "none", fontSize: 12 }}>
                              <span style={{ color: LT.inkSoft }}>CPA {a.cpaNm.toFixed(2)}nm</span>
                              <b style={{ color: tone }}>TCPA {a.tcpaMinutes.toFixed(1)}분</b>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ color: muted, fontSize: 13 }}>현재 근접 충돌 위험이 감지된 선박이 없습니다.</div>
                  )}
                </Card>

                <Card>
                  <CardHead title="항만별 현황" right={<Pill tone="slate">현재 기준</Pill>} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {data.snapshot.ports.map((port) => {
                      const c = levelColor(port.congestionLevel);
                      return (
                        <div key={port.id}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <b style={{ fontSize: 14 }}>{port.name}</b>
                              <span style={{ fontSize: 11, fontWeight: 800, color: c }}>{port.congestionStatus}</span>
                            </span>
                            <b style={{ fontSize: 16, color: c }}>{Math.round(port.congestionLevel * 100)}%</b>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: LT.tile, margin: "6px 0 4px" }}>
                            <div style={{ width: `${Math.round(port.congestionLevel * 100)}%`, height: 8, borderRadius: 4, background: c }} />
                          </div>
                          <div style={{ fontSize: 12, color: muted }}>
                            입항 {port.arrivingCount ?? "-"}건 · 재항 {port.waitingOrAnchoredCount ?? "-"}척
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card>
                  <CardHead title="데이터 상태" right={<Pill tone="green">● 정상</Pill>} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
                    <Row k="AIS 선박" v={`${data.snapshot.ships.total.toLocaleString("ko-KR")}척 · 항해 ${data.snapshot.ships.underway} / 정박 ${data.snapshot.ships.anchored}`} />
                    <Row k="마지막 갱신" v={formatDateTime(data.lastUpdated)} />
                    <Row k="계산 기준" v={data.basis} />
                  </div>
                  {(briefing?.nextSteps?.length ?? 0) > 0 && (
                    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${LT.borderColor}` }}>
                      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>다음 검토</div>
                      {briefing!.nextSteps.map((s) => (
                        <div key={s} style={{ fontSize: 12.5, color: LT.inkSoft, lineHeight: 1.55 }}>
                          · {s}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </div>

            {/* 하단 고지 */}
            <div style={{ display: "flex", gap: 8, padding: "10px 16px", borderRadius: 12, background: "rgba(232,149,43,.10)", color: LT.inkSoft, fontSize: 12, fontWeight: 600, lineHeight: 1.55 }}>
              <span style={{ color: LT.amber, fontWeight: 800 }}>⚠</span>
              <span>
                {briefing?.disclaimer} {data.calculationNote}
              </span>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: muted }}>{k}</span>
      <b style={{ textAlign: "right" }}>{v}</b>
    </div>
  );
}
