"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CongestionForecast, CongestionPoint, RegionCongestionSeries } from "@/frontend/types/domain";
import { BUSAN_DISPLAY_PORT, congestionDisplayColor, congestionDisplayLabel } from "@/frontend/config/ports";
import LeftRail, { RAIL_OFFSET } from "@/frontend/components/LeftRail";
import AiCongestionAnalysisCard from "@/frontend/components/congestion/AiCongestionAnalysisCard";
import { LT } from "@/frontend/components/theme";

const muted = LT.muted;
const panel = LT.panelSolid;

function congestionColor(level: number): string {
  return congestionDisplayColor(level);
}

// 곡선의 시각(time)은 "그날 00시 UTC + KST시*1h"라 getUTCHours()가 곧 KST 시(0~23)다.
function kstHourOf(iso: string): number {
  return new Date(iso).getUTCHours();
}
function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}시`;
}
function nowKstHour(): number {
  return (new Date().getUTCHours() + 9) % 24;
}

const card: CSSProperties = { background: panel, borderRadius: 18, padding: "20px 22px", boxShadow: LT.shadow };

// 시간대 곡선 → 시각 순 [{hour, pct, vessels}]
function toSeries(forecast: CongestionPoint[]) {
  return [...forecast]
    .map((p) => ({ hour: kstHourOf(p.time), pct: Math.round(p.level * 100), vessels: p.areaVesselCount ?? null }))
    .sort((a, b) => a.hour - b.hour);
}

function peakOf(forecast: CongestionPoint[]) {
  if (!forecast.length) return null;
  const max = forecast.reduce((m, p) => (p.level > m.level ? p : m), forecast[0]);
  const avg = forecast.reduce((s, p) => s + p.level, 0) / forecast.length;
  return { pct: Math.round(max.level * 100), hour: kstHourOf(max.time), level: max.level, avgPct: Math.round(avg * 100) };
}

// 반원형 게이지 — 0~40 원활 / 40~70 보통 / 70~100 혼잡 구간 위에 현재 값을 표시한다.
function Gauge({ level }: { level: number }) {
  const W = 300, cx = 150, cy = 150, r = 120;
  const pt = (v: number, rr = r) => {
    const a = Math.PI * (1 - v);
    return [cx + rr * Math.cos(a), cy - rr * Math.sin(a)];
  };
  const arc = (a: number, b: number) => {
    const [x1, y1] = pt(a), [x2, y2] = pt(b);
    return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
  };
  const v = Math.max(0.005, Math.min(0.995, level));
  const color = congestionColor(level);
  const [nx, ny] = pt(v);
  return (
    <svg width={W} height={170} viewBox={`0 0 ${W} 170`} style={{ display: "block", margin: "0 auto" }}>
      <path d={arc(0.005, 0.395)} stroke="#16a34a" strokeOpacity={0.22} strokeWidth={16} strokeLinecap="round" fill="none" />
      <path d={arc(0.405, 0.695)} stroke="#d97706" strokeOpacity={0.22} strokeWidth={16} strokeLinecap="round" fill="none" />
      <path d={arc(0.705, 0.995)} stroke="#dc2626" strokeOpacity={0.22} strokeWidth={16} strokeLinecap="round" fill="none" />
      <path d={arc(0.005, v)} stroke={color} strokeWidth={16} strokeLinecap="round" fill="none" />
      <circle cx={nx} cy={ny} r={10} fill="#fff" stroke={color} strokeWidth={5} />
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize={44} fontWeight={900} fill={LT.ink}>
        {Math.round(level * 100)}%
      </text>
      <text x={cx} y={cy + 2} textAnchor="middle" fontSize={12} fontWeight={600} fill={muted}>
        항만 전체 혼잡도
      </text>
      {[0, 40, 70, 100].map((t) => {
        const [x, y] = pt(t / 100, r + 20);
        return (
          <text key={t} x={x} y={y + 4} textAnchor="middle" fontSize={10} fill={muted}>
            {t}
          </text>
        );
      })}
    </svg>
  );
}

// 24시간 추이 영역 차트 — "지금" 시각을 선과 점으로, 70%/40% 기준선을 점선으로 표시한다.
function TrendChart({ forecast }: { forecast: CongestionPoint[] }) {
  const data = useMemo(() => toSeries(forecast), [forecast]);
  if (!data.length) return <div style={{ color: muted, fontSize: 13, padding: "60px 0", textAlign: "center" }}>시간대별 데이터가 없습니다.</div>;
  const nowHour = nowKstHour();
  const nowPoint = data.reduce((best, d) => (Math.abs(d.hour - nowHour) < Math.abs(best.hour - nowHour) ? d : best), data[0]);
  return (
    <div style={{ height: 250, width: "100%" }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 22, right: 12, left: -8, bottom: 0 }}>
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LT.blue} stopOpacity={0.26} />
              <stop offset="100%" stopColor={LT.blue} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(15,23,42,0.06)" vertical={false} />
          <XAxis dataKey="hour" type="number" domain={[0, 23]} ticks={[0, 3, 6, 9, 12, 15, 18, 21, 23]} tickFormatter={hourLabel} tick={{ fontSize: 11, fill: muted }} stroke="rgba(15,23,42,0.12)" tickLine={false} />
          <YAxis domain={[0, 100]} ticks={[0, 40, 70, 100]} tick={{ fontSize: 11, fill: muted }} stroke="rgba(15,23,42,0.12)" tickLine={false} width={40} />
          <Tooltip
            cursor={{ stroke: "rgba(15,23,42,0.18)", strokeDasharray: "3 3" }}
            formatter={(v: number, _n, item) => {
              const vc = (item?.payload as { vessels?: number | null })?.vessels;
              return [`${v}%${vc != null ? ` · 해역 ${vc}척` : ""}`, "혼잡도"];
            }}
            labelFormatter={(h: number) => hourLabel(h)}
            contentStyle={{ borderRadius: 12, border: LT.border, boxShadow: LT.shadow, fontSize: 12 }}
          />
          <ReferenceLine y={70} stroke={LT.red} strokeOpacity={0.45} strokeDasharray="5 6" label={{ value: "혼잡 70%", position: "insideTopRight", fill: LT.red, fontSize: 11, fontWeight: 700 }} />
          <ReferenceLine y={40} stroke={LT.amber} strokeOpacity={0.45} strokeDasharray="5 6" label={{ value: "보통 40%", position: "insideTopRight", fill: LT.amber, fontSize: 11, fontWeight: 700 }} />
          <Area type="monotone" dataKey="pct" stroke={LT.blue} strokeWidth={3} fill="url(#trendGrad)" />
          <ReferenceLine x={nowPoint.hour} stroke={LT.ink} strokeWidth={1.5} label={{ value: `지금 ${hourLabel(nowPoint.hour)} · ${nowPoint.pct}%`, position: "top", fill: LT.ink, fontSize: 11, fontWeight: 800 }} />
          <ReferenceDot x={nowPoint.hour} y={nowPoint.pct} r={6} fill={LT.blue} stroke="#fff" strokeWidth={3} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// 항만 카드의 작은 추이선
function Sparkline({ forecast, color }: { forecast: CongestionPoint[]; color: string }) {
  const data = toSeries(forecast);
  if (!data.length) return <div style={{ height: 64, display: "flex", alignItems: "center", justifyContent: "center", color: muted, fontSize: 12 }}>데이터 없음</div>;
  const W = 300, H = 64, x = (h: number) => (h / 23) * W, y = (p: number) => 6 + (1 - p / 100) * (H - 12);
  const line = data.map((d, i) => `${i ? "L" : "M"} ${x(d.hour).toFixed(1)} ${y(d.pct).toFixed(1)}`).join(" ");
  const nowH = nowKstHour();
  const now = data.reduce((b, d) => (Math.abs(d.hour - nowH) < Math.abs(b.hour - nowH) ? d : b), data[0]);
  return (
    <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <line x1={0} y1={y(70)} x2={W} y2={y(70)} stroke={LT.red} strokeOpacity={0.35} strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
      <path d={`${line} L ${x(data[data.length - 1].hour)} ${H} L ${x(data[0].hour)} ${H} Z`} fill={color} fillOpacity={0.1} />
      <path d={line} stroke={color} strokeWidth={2.5} fill="none" vectorEffect="non-scaling-stroke" />
      <line x1={x(now.hour)} y1={0} x2={x(now.hour)} y2={H} stroke={LT.ink} strokeOpacity={0.45} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StatBox({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 12, background: LT.tile, padding: "10px 14px" }}>
      <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800 }}>
        {value}
        <span style={{ fontSize: 11, color: muted, marginLeft: 3, fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  );
}

function Chip({ text, color }: { text: string; color: string }) {
  return <span style={{ fontSize: 11, fontWeight: 800, color, background: `${color}1f`, padding: "3px 8px", borderRadius: 999 }}>{text}</span>;
}

export default function CongestionPage() {
  const [overall, setOverall] = useState<CongestionForecast | null>(null);
  const [regions, setRegions] = useState<RegionCongestionSeries[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [o, r] = await Promise.all([fetch("/api/congestion").then((x) => x.json()), fetch("/api/congestion/regions").then((x) => x.json())]);
        if (!alive) return;
        setOverall(o);
        setRegions(Array.isArray(r) ? r : []);
      } catch {
        if (alive) setError("혼잡도 데이터를 불러오지 못했습니다.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const currentAisCount = useMemo(() => {
    if (!overall) return null;
    const now = Date.now();
    let best: { d: number; v: number } | null = null;
    for (const p of overall.forecast) {
      if (p.areaVesselCount == null) continue;
      const d = Math.abs(new Date(p.time).getTime() - now);
      if (!best || d < best.d) best = { d, v: p.areaVesselCount };
    }
    return best?.v ?? null;
  }, [overall]);

  const totals = useMemo(
    () => (regions ?? []).reduce((a, r) => ({ arrivals: a.arrivals + r.arrivals, departures: a.departures + r.departures }), { arrivals: 0, departures: 0 }),
    [regions]
  );

  const selectedRegion = regions?.find((r) => r.id === selectedId) ?? null;
  const trendForecast = selectedRegion ? selectedRegion.forecast : overall?.forecast ?? [];
  const currentLevel = overall?.currentLevel ?? 0;
  const windowH = regions?.[0]?.activityWindowHours ?? 24;
  const overallPeak = overall ? peakOf(overall.forecast) : null;
  // 다음 혼잡 예상: 각 항만 곡선의 최고점 중 가장 높은 항만
  const busiestPeak = useMemo(() => {
    let best: { name: string; pct: number; hour: number } | null = null;
    for (const r of regions ?? []) {
      const p = peakOf(r.forecast);
      if (p && (!best || p.pct > best.pct)) best = { name: r.name, pct: p.pct, hour: p.hour };
    }
    return best;
  }, [regions]);

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: LT.pageBg, color: LT.ink, paddingLeft: RAIL_OFFSET, fontFamily: "Pretendard, system-ui, sans-serif" }}>
      <LeftRail active="/congestion" />

      <div style={{ padding: "16px 24px 24px 8px", display: "flex", flexDirection: "column", gap: 18 }}>
        {/* 헤더 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>{BUSAN_DISPLAY_PORT.name} 혼잡도 통계</h1>
            <p style={{ color: muted, fontSize: 13, margin: "2px 0 0" }}>해역 혼잡도는 해수부 연안AIS 통계, 입·출항 수치는 최근 {windowH}시간 Port-MIS 신고 기준입니다.</p>
          </div>
          <Chip text={`● ${hourLabel(nowKstHour())} KST 기준`} color={LT.green} />
        </div>

        {error && <div style={{ ...card, color: LT.red }}>{error}</div>}

        {/* 1행: 게이지 + 24시간 추이 */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <div style={{ ...card, flex: "0 1 460px", minWidth: 340 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>지금 항만 전체</div>
                <div style={{ fontSize: 12, color: muted }}>해역 밀도 + 입항 압력</div>
              </div>
              <Chip text={congestionDisplayLabel(currentLevel)} color={congestionColor(currentLevel)} />
            </div>
            <Gauge level={currentLevel} />
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <StatBox label="해역 AIS 척수" value={currentAisCount != null ? currentAisCount.toLocaleString() : "—"} unit="척" />
                <StatBox label="24시간 평균" value={overallPeak ? overallPeak.avgPct : "—"} unit="%" />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <StatBox label={`입항 신고 ${windowH}h`} value={totals.arrivals} unit="건" />
                <StatBox label={`출항 신고 ${windowH}h`} value={totals.departures} unit="건" />
              </div>
            </div>
          </div>

          <div style={{ ...card, flex: "1 1 600px", minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800 }}>24시간 혼잡도 추이</div>
                <div style={{ fontSize: 12, color: muted }}>오늘 00시–23시 · {selectedRegion ? selectedRegion.name : "항만 전체"}</div>
              </div>
              <div style={{ display: "flex", gap: 2, padding: 3, borderRadius: 10, background: LT.tile }}>
                {[{ id: "all", name: "항만 전체" }, ...(regions ?? [])].map((r) => {
                  const on = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      style={{ border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: on ? 800 : 600, fontFamily: "inherit", cursor: "pointer", background: on ? "#fff" : "transparent", color: on ? LT.ink : muted, boxShadow: on ? "0 1px 3px rgba(15,23,42,.08)" : "none" }}
                    >
                      {r.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <TrendChart forecast={trendForecast} />
            {busiestPeak && busiestPeak.pct >= 40 && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, padding: "10px 14px", borderRadius: 12, background: busiestPeak.pct >= 70 ? "rgba(239,68,68,.08)" : "rgba(232,149,43,.10)" }}>
                <b style={{ color: busiestPeak.pct >= 70 ? LT.red : LT.amber, fontSize: 13 }}>
                  가장 혼잡한 시간 {hourLabel(busiestPeak.hour)} · {busiestPeak.name} {busiestPeak.pct}%
                </b>
                <span style={{ fontSize: 13, color: LT.inkSoft }}>입항 예정 선박에 JIT 감속 권고를 적용하면 대기를 줄일 수 있습니다.</span>
              </div>
            )}
            {selectedRegion && !selectedRegion.aisSeparable && (
              <div style={{ marginTop: 10, fontSize: 11.5, color: muted, lineHeight: 1.5 }}>
                ※ 이 지역은 연안 AIS 통계 격자(~10km)상 인접 항과 같은 셀에 묶여 곡선이 유사하게 나옵니다. 입·출항 수치는 Port-MIS 부두 매칭으로 분리됩니다.
              </div>
            )}
          </div>
        </div>

        {/* 2행: 항만별 비교 */}
        {regions && regions.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 18 }}>
            {regions.map((r) => {
              const c = congestionColor(r.currentLevel);
              const peak = peakOf(r.forecast);
              const on = r.id === selectedId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(on ? "all" : r.id)}
                  style={{ ...card, textAlign: "left", cursor: "pointer", border: "none", borderTop: `4px solid ${c}`, fontFamily: "inherit", outline: on ? `2px solid ${c}` : "none" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 16, fontWeight: 800 }}>{r.name}</span>
                        <Chip text={congestionDisplayLabel(r.currentLevel)} color={c} />
                      </div>
                    </div>
                    <span style={{ fontSize: 32, fontWeight: 900, color: c, lineHeight: 1 }}>
                      {Math.round(r.currentLevel * 100)}
                      <span style={{ fontSize: 14 }}>%</span>
                    </span>
                  </div>
                  <div style={{ margin: "12px 0 4px" }}>
                    <Sparkline forecast={r.forecast} color={c} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: muted, marginBottom: 12 }}>
                    <span>00시</span>
                    <span style={{ fontWeight: 800, color: peak && peak.pct >= 70 ? LT.red : muted }}>{peak ? `${hourLabel(peak.hour)} 최고 ${peak.pct}%` : ""}</span>
                    <span>23시</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <StatBox label={`입항 ${r.activityWindowHours}h`} value={r.arrivals} unit="건" />
                    <StatBox label={`출항 ${r.activityWindowHours}h`} value={r.departures} unit="건" />
                    <StatBox label="재항" value={r.currentVessels} unit="척" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {!regions && !error && <div style={{ ...card, color: muted }}>불러오는 중…</div>}

        {/* 3행: AI 원인 분석 */}
        <AiCongestionAnalysisCard />
      </div>
    </div>
  );
}
