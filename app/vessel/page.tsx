"use client";

// 단일 선박 모니터링 콘솔 — 좌측 레일 2번(🚢)에서 진입한다.
// 실데이터: AIS(/api/ships) + Port-MIS(/api/port-calls) + 혼잡도(/api/congestion) + 기상(/api/weather).
// 조립·파생 계산은 backend/vessel/build-view.ts(순수 함수)에서 하고, 여기서는 렌더만 한다.
// 소스가 없는 항목(엔진 계기·CII 등급·태풍 트랙)은 demo-telemetry 값을 쓰되 "예시·미연동"으로 표기.
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import LeftRail, { ImgIcon, RAIL_OFFSET } from "@/frontend/components/LeftRail";
import { LT } from "@/frontend/components/theme";
import {
  beaufortFromWindMs,
  CII_GRADE_BANDS,
  CII_GRADE_COLOR,
  STATUS_LABEL,
  windDir8,
} from "@/frontend/config/vessel-display";
import { BUSAN_DISPLAY_PORT, congestionDisplayColor, congestionDisplayLabel } from "@/frontend/config/ports";
import type { WeatherForecast } from "@/frontend/types/domain";
import type { TyphoonInfo, TyphoonTrackPoint } from "@/frontend/types/marine";
import type { VesselMonitorData, VesselView } from "@/frontend/types/vessel";

const CiiSpeedChart = dynamic(() => import("@/frontend/components/vessel/CiiSpeedChart"), { ssr: false });

const muted = LT.muted;
const panel = LT.panelSolid;
const border = LT.border;
const ink = LT.ink;
const DASH = "—";

function congestionColor(level: number): string {
  return congestionDisplayColor(level);
}

// ── 공용 소품 ───────────────────────────────────────────────────────────
// 배지 pill (파랑/앰버/그린)
function Pill({ text, tone = "blue" }: { text: string; tone?: "blue" | "amber" | "green" }) {
  const map = {
    blue: { color: LT.blue, bg: LT.blueSoft },
    amber: { color: "#b45309", bg: "rgba(232,149,43,.14)" },
    green: { color: LT.green, bg: "rgba(22,163,74,.12)" },
  }[tone];
  return (
    <span style={{ fontSize: 9.5, fontWeight: 800, color: map.color, background: map.bg, padding: "3px 8px", borderRadius: 20, letterSpacing: ".02em" }}>{text}</span>
  );
}

function Panel({ title, badge, children, style }: { title: string; badge?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", background: panel, borderRadius: 18, padding: 20, boxShadow: LT.shadow, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: "-.01em", color: ink }}>{title}</span>
        {badge}
      </div>
      {children}
    </div>
  );
}

// 라벨 + 값 (테두리 없는 셀)
function Cell({ label, value, unit, accent }: { label: string; value: ReactNode; unit?: string; accent?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: muted, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? ink, lineHeight: 1.1 }}>
        {value}
        {unit && <span style={{ fontSize: 11, color: muted, marginLeft: 3, fontWeight: 700 }}>{unit}</span>}
      </div>
    </div>
  );
}

// 상단 개별 지표 카드 (Speed / DFOC / Position / Weather / Attained CII)
function StatCard({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 0,
        borderRadius: 18,
        padding: "16px 18px",
        background: panel,
        boxShadow: LT.shadow,
        ...style,
      }}
    >
      <span style={{ fontSize: 12, color: muted, fontWeight: 600 }}>{label}</span>
      {children}
    </div>
  );
}

// 큰 값 + 단위
function Big({ value, unit, accent, dark }: { value: ReactNode; unit?: string; accent?: string; dark?: boolean }) {
  return (
    <span style={{ fontSize: 22, fontWeight: 800, color: accent ?? (dark ? "#fff" : ink), lineHeight: 1.2 }}>
      {value}
      {unit && <span style={{ fontSize: 10.5, color: dark ? "rgba(255,255,255,.55)" : muted, marginLeft: 2, fontWeight: 700 }}>{unit}</span>}
    </span>
  );
}

// ── 포맷 헬퍼 ───────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 3 });
function posText(lat: number, lon: number): { lat: string; lon: string } {
  return {
    lat: `${Math.abs(lat).toFixed(4)}°${lat >= 0 ? "N" : "S"}`,
    lon: `${Math.abs(lon).toFixed(4)}°${lon >= 0 ? "E" : "W"}`,
  };
}
function kst(iso: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return DASH;
  return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
}
// 짧은 KST 시각 "MM.DD HH:mm" — 카드 안 좁은 칸용
function kstShort(iso: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return DASH;
  const p: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(d)) p[part.type] = part.value;
  return `${p.month}.${p.day} ${p.hour}:${p.minute}`;
}
function latLonText(lat: number, lon: number): string {
  const latText = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? "N" : "S"}`;
  const lonText = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? "E" : "W"}`;
  return `${latText}, ${lonText}`;
}
function latestTyphoonPoint(typhoon: TyphoonInfo): TyphoonTrackPoint | null {
  if (typhoon.track.length === 0) return null;
  return typhoon.track.reduce((latest, point) => (point.time > latest.time ? point : latest));
}
function statusColor(status: string): string {
  if (status === "underway") return LT.green;
  if (status === "moored") return LT.blue;
  return LT.amber;
}

interface TyphoonApiResponse {
  typhoons?: TyphoonInfo[];
  error?: string;
}

async function fetchTyphoonInfo(): Promise<TyphoonApiResponse> {
  try {
    const response = await fetch("/api/marine/typhoon", { cache: "no-store" });
    const data = (await response.json().catch(() => null)) as TyphoonApiResponse | null;
    if (!response.ok) return { error: data?.error ?? "태풍정보 API 조회에 실패했습니다." };
    return { typhoons: Array.isArray(data?.typhoons) ? data.typhoons : [] };
  } catch {
    return { error: "태풍정보 API에 연결할 수 없습니다." };
  }
}

export default function VesselPage() {
  const [plannedSpeed, setPlannedSpeed] = useState(11);
  const [vesselData, setVesselData] = useState<VesselMonitorData | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [typhoons, setTyphoons] = useState<TyphoonInfo[] | null>(null);
  const [typhoonError, setTyphoonError] = useState<string | null>(null);
  const [typhoonLoading, setTyphoonLoading] = useState(true);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    let active = true;
    async function load() {
      const [vessel, wx, typhoon] = await Promise.all([
        fetch("/api/vessel").then((r) => r.json()).catch(() => null),
        fetch("/api/weather").then((r) => r.json()).catch(() => null),
        fetchTyphoonInfo(),
      ]);
      if (!active) return;
      setVesselData(vessel && Array.isArray(vessel.items) ? vessel : null);
      setWeather(wx && wx.points ? wx : null);
      setTyphoons(typhoon.typhoons ?? null);
      setTyphoonError(typhoon.error ?? null);
      setTyphoonLoading(false);
      setNow(new Date());
    }
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  // 후보 목록(위치 매칭된 배 우선, 톤수 큰 순) — 상위 40척만 선택지로.
  const items = useMemo(() => vesselData?.items ?? [], [vesselData]);
  const selectedItem = items[selectedIdx] ?? items[0] ?? null;
  const view = selectedItem?.view ?? null;
  // CII: Required·등급경계는 IMO 표준식, Attained는 서버에서 계산한 대표 프로파일 추정값.
  const cii = selectedItem?.cii ?? null;
  const ciiCurve = selectedItem?.approachCiiCurve ?? null;

  useEffect(() => {
    if (ciiCurve) setPlannedSpeed(ciiCurve.selectedSpeedKn);
  }, [ciiCurve, selectedIdx]);

  // 현재 시각 기상(가장 가까운 예보 포인트)
  const wxPoint = useMemo(() => {
    if (!weather?.points?.length) return null;
    const t = now.getTime();
    return weather.points.reduce((a, b) => (Math.abs(new Date(b.time).getTime() - t) < Math.abs(new Date(a.time).getTime() - t) ? b : a));
  }, [weather, now]);

  const ciiCurvePoints = useMemo(() => ciiCurve?.points ?? [], [ciiCurve?.points]);
  const selectedPt = useMemo(() => {
    if (ciiCurvePoints.length === 0) return null;
    return ciiCurvePoints.reduce((a, b) => (Math.abs(b.speed - plannedSpeed) < Math.abs(a.speed - plannedSpeed) ? b : a));
  }, [ciiCurvePoints, plannedSpeed]);

  const level = vesselData?.congestion.currentLevel ?? 0;
  const pos = view?.position ? posText(view.position.lat, view.position.lon) : null;
  const bf = wxPoint?.windSpeed != null ? beaufortFromWindMs(wxPoint.windSpeed) : null;

  // 감속 권고(JIT) — 항해 중 + 위치 있는 접근 선박에만. Port-MIS 실제 선종으로 정밀 계산.
  const advisory = selectedItem?.advisory ?? null;

  // 왼쪽 선박 목록: 검색어 + 상태 필터
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "underway" | "moored" | "anchored">("all");
  const statusCounts = useMemo(
    () => items.reduce((acc, it) => ({ ...acc, [it.view.status]: (acc[it.view.status] ?? 0) + 1 }), {} as Record<string, number>),
    [items]
  );
  const listed = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => statusFilter === "all" || item.view.status === statusFilter)
      .filter(({ item }) => !q || item.label.toLowerCase().includes(q) || (item.view.callSign ?? "").toLowerCase().includes(q) || (item.view.mmsi ?? "").includes(q));
  }, [items, query, statusFilter]);

  // 입출항 단계: 직전 출항 → 부산항 입항 → 선석(현재) → 다음 기항지
  const steps = view
    ? [
        { title: `${view.fromPort ?? "직전 항"} 출항`, sub: "직전 출항항", state: "done" as const },
        { title: "부산항 입항 신고", sub: view.arrivalTimeIso ? kstShort(view.arrivalTimeIso) : "신고 시각 없음", state: "done" as const },
        { title: view.berthName ?? STATUS_LABEL[view.status], sub: STATUS_LABEL[view.status], state: "now" as const },
        { title: view.toPort ?? "다음 기항지", sub: "다음 기항지", state: "next" as const },
      ]
    : [];

  return (
    <div style={{ position: "fixed", inset: 0, background: LT.pageBg, overflow: "hidden", fontFamily: "Pretendard, system-ui, sans-serif", color: ink }}>
      <LeftRail active="/vessel" />

      <div style={{ position: "absolute", top: 16, left: RAIL_OFFSET + 8, right: 24, bottom: 16, display: "flex", flexDirection: "column", gap: 18 }}>
        {/* ── 헤더 ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.01em" }}>선박 모니터링</div>
            <div style={{ fontSize: 13, color: muted, marginTop: 2 }}>선박을 고르면 위치·운항 상태와 대기·연료·탄소 지표를 한 화면에서 확인할 수 있습니다.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none" }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: LT.green, background: "rgba(22,163,74,.12)", padding: "4px 10px", borderRadius: 999 }}>
              ● 실시간 · {kstShort(now.toISOString()).slice(-5)} KST
            </span>
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 18 }}>
          {/* ── 왼쪽: 선박 목록 ── */}
          <div style={{ ...card, width: 340, flex: "none", display: "flex", flexDirection: "column", gap: 12, padding: "18px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 15, fontWeight: 800 }}>정박·접근 선박</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: LT.blue }}>{items.length}척</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: LT.tile, borderRadius: 10, padding: "9px 12px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={muted} strokeWidth="2.2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="선박명 · MMSI · 호출부호 검색"
                style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", fontSize: 13, fontFamily: "inherit", color: ink }}
              />
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {([
                ["all", "전체", items.length],
                ["underway", "항해", statusCounts.underway ?? 0],
                ["moored", "접안", statusCounts.moored ?? 0],
                ["anchored", "묘박", statusCounts.anchored ?? 0],
              ] as const).map(([key, label, n]) => {
                const on = statusFilter === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setStatusFilter(key)}
                    style={{ border: "none", borderRadius: 8, padding: "5px 9px", fontSize: 11.5, fontWeight: 800, fontFamily: "inherit", cursor: "pointer", background: on ? LT.blue : LT.tile, color: on ? "#fff" : LT.inkSoft }}
                  >
                    {label} {n}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
              {listed.map(({ item, idx }) => {
                const sel = item === selectedItem;
                return (
                  <button
                    key={item.id ?? idx}
                    type="button"
                    onClick={() => setSelectedIdx(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 8,
                      textAlign: "left",
                      padding: "10px 12px",
                      border: "none",
                      borderLeft: sel ? `3px solid ${LT.blue}` : "3px solid transparent",
                      borderRadius: 10,
                      background: sel ? LT.blueSoft : "transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 13, fontWeight: 800, color: sel ? LT.blue : ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
                      <span style={{ display: "block", fontSize: 11, color: muted }}>
                        {item.view.type ?? DASH}
                        {item.view.nationality ? ` · ${item.view.nationality}` : ""}
                      </span>
                    </span>
                    <StatusChip status={item.view.status} />
                  </button>
                );
              })}
              {listed.length === 0 && <div style={{ fontSize: 12, color: muted, padding: 12 }}>{items.length === 0 ? "선박 정보를 불러오는 중입니다." : "조건에 맞는 선박이 없습니다."}</div>}
            </div>
          </div>

          {/* ── 오른쪽: 선택 선박 상세 ── */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 18, overflowY: "auto", paddingBottom: 2 }}>
            {/* 선박 요약 + 항로 */}
            <div style={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "18px 22px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <div style={{ width: 52, height: 52, flex: "none", borderRadius: 14, background: LT.blueSoft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <ImgIcon src="/icons/ship.png" size={28} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-.01em" }}>{selectedItem?.label ?? "선박을 선택하세요"}</span>
                    {view && <StatusChip status={view.status} />}
                    {selectedItem?.hasMatchedShip && <Pill text="AIS 연결" tone="blue" />}
                  </div>
                  <div style={{ fontSize: 12, color: muted, marginTop: 4 }}>
                    {view?.type ?? DASH}
                    {view?.nationality ? ` · ${view.nationality}` : ""} · IMO {view?.imo ?? DASH} · MMSI {view?.mmsi ?? DASH} · 호출부호 {view?.callSign ?? DASH}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <RoutePort caption="직전 출항항" name={view?.fromPort ?? DASH} />
                <span style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: muted }} />
                  <span style={{ width: 72, height: 2, background: LT.blue }} />
                  <span style={{ width: 8, height: 8, borderRadius: 4, background: LT.blue }} />
                </span>
                <RoutePort caption="다음 기항지" name={view?.toPort ?? DASH} color={LT.blue} />
                <div style={{ borderLeft: `1px solid ${LT.borderColor}`, paddingLeft: 16 }}>
                  <RoutePort caption="현재 선석" name={view?.berthName ?? DASH} />
                </div>
              </div>
            </div>

            {/* 핵심 지표 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 18 }}>
              <StatCard label="속력 (SOG)">
                <Big value={view?.speedKn != null ? view.speedKn.toFixed(1) : DASH} unit="kn" />
                <Caption>{view ? STATUS_LABEL[view.status] : DASH}</Caption>
              </StatCard>
              <StatCard label="현재 위치">
                <Big value={pos ? `${pos.lat} ${pos.lon}` : DASH} />
                <Caption>AIS 수신 위치</Caption>
              </StatCard>
              <StatCard label="항만 기상">
                <Big value={bf != null ? `풍력 ${bf}` : DASH} unit={wxPoint?.windSpeed != null ? `· ${wxPoint.windDeg != null ? windDir8(wxPoint.windDeg) : ""} ${wxPoint.windSpeed}m/s` : undefined} />
                <Caption>파고 {wxPoint?.waveM ?? DASH}m</Caption>
              </StatCard>
              <StatCard label="탄소집약도 (CII)">
                <Big value={cii ? `${cii.grade} ${cii.attainedCii.toFixed(2)}` : DASH} accent={cii ? CII_GRADE_COLOR[cii.grade] : undefined} />
                <Caption color={cii && cii.marginPct < 0 ? LT.red : undefined}>
                  {cii ? `기준 ${cii.requiredCii.toFixed(2)} 대비 ${Math.abs(cii.marginPct).toFixed(1)}% ${cii.marginPct < 0 ? "초과" : "이하"}` : "계산 불가"}
                </Caption>
              </StatCard>
            </div>

            {/* 판단 카드: 선석 대기 예측 + 감속 권고 */}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <Panel title="선석 대기 예측" badge={vesselData ? <span style={{ fontSize: 10, fontWeight: 800, color: LT.green }}>● 실시간</span> : undefined} style={{ flex: "1 1 420px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
                  <Cell label="예상 도착 (ETA)" value={view?.status === "underway" && view.etaIso ? kstShort(view.etaIso) : view ? STATUS_LABEL[view.status] : DASH} accent={view && view.status !== "underway" ? LT.green : undefined} />
                  <Cell label="잔여 소요" value={view?.remainingHours != null ? view.remainingHours.toFixed(1) : view && view.status !== "underway" ? "0" : DASH} unit="h" />
                  <Cell label="현재 속력" value={view?.speedKn != null ? view.speedKn.toFixed(1) : DASH} unit="kn" />
                </div>
                <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: `${congestionColor(level)}14` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: LT.inkSoft, fontWeight: 700 }}>현재 항만 혼잡도</span>
                    <span style={{ fontSize: 14, fontWeight: 800, color: congestionColor(level) }}>
                      {Math.round(level * 100)}% · {congestionDisplayLabel(level)}
                    </span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,.7)" }}>
                    <div style={{ width: `${Math.round(level * 100)}%`, height: 8, borderRadius: 4, background: congestionColor(level) }} />
                  </div>
                </div>
              </Panel>

              <Panel title="감속 권고 · JIT 정시도착" badge={<Pill text="연료·CO₂ 절감" tone="green" />} style={{ flex: "1 1 420px" }}>
                {advisory ? (
                  advisory.savings.fuelTon > 0 ? (
                    <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                      <div style={{ flex: "1 1 180px", background: "linear-gradient(135deg,#2f6bff,#5b8cff)", borderRadius: 14, padding: 14, color: "#fff" }}>
                        <div style={{ fontSize: 10.5, fontWeight: 800, opacity: 0.9 }}>권고 감속 속도</div>
                        <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1.1 }}>
                          {view?.speedKn?.toFixed(0)} → {advisory.recommendedSpeedKn}
                          <span style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, marginLeft: 4 }}>kn</span>
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.92, marginTop: 4 }}>
                          도착을 {advisory.etaDelayHours}h 늦춰 묘박 대기 {advisory.waitHoursIfFullSpeed}h를 항해로 흡수
                        </div>
                      </div>
                      <div style={{ flex: "1 1 200px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 10px", alignContent: "center" }}>
                        <Cell label="연료 절감" value={advisory.savings.fuelTon.toFixed(1)} unit="t" accent={LT.blue} />
                        <Cell label="CO₂ 감축" value={advisory.savings.co2Ton.toFixed(1)} unit="t" accent={LT.green} />
                        <Cell label="연료비 절감" value={`$${advisory.savings.fuelCostUsd.toLocaleString()}`} accent="#7c3aed" />
                        <Cell label="ETA 지연" value={advisory.etaDelayHours} unit="h" />
                      </div>
                    </div>
                  ) : (
                    <EmptyNote title="감속 이득이 없습니다" desc={`현재 항만이 원활해 현 속력 ${view?.speedKn?.toFixed(1) ?? DASH}kn 유지를 권고합니다.`} />
                  )
                ) : (
                  <EmptyNote
                    title={view && view.status !== "underway" ? `${STATUS_LABEL[view.status]} 중인 선박입니다` : "권고 대상이 아닙니다"}
                    desc="감속 권고는 항해 중 부산항에 접근하는 선박에만 계산됩니다."
                  />
                )}
              </Panel>
            </div>

            {/* 지표 카드: CII 등급 · 연료 소모 · 태풍 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 18 }}>
              <Panel title="CII 등급" badge={<Pill text="IMO 표준식 + 추정" tone="blue" />}>
                {cii ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 72, height: 72, flex: "none", borderRadius: 16, background: `${CII_GRADE_COLOR[cii.grade]}18`, color: CII_GRADE_COLOR[cii.grade], display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 30, fontWeight: 900, lineHeight: 1 }}>{cii.grade}</span>
                        <span style={{ fontSize: 10, fontWeight: 800 }}>등급</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>
                          실적 {cii.attainedCii.toFixed(2)} / 기준 {cii.requiredCii.toFixed(2)}
                        </div>
                        <div style={{ fontSize: 12, color: cii.marginPct < 0 ? LT.red : LT.green, marginTop: 2 }}>
                          기준 대비 {Math.abs(cii.marginPct).toFixed(1)}% {cii.marginPct < 0 ? "초과" : "이하"} · {cii.year} 감축률 {((1 - cii.requiredCii / cii.referenceCii) * 100).toFixed(0)}% 적용
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 4, marginTop: 16 }}>
                      {CII_GRADE_BANDS.map((b) => (
                        <div key={b.grade} style={{ flex: 1, textAlign: "center" }}>
                          <div style={{ height: b.grade === cii.grade ? 10 : 6, borderRadius: 3, background: b.color, opacity: b.grade === cii.grade ? 1 : 0.35 }} />
                          <div style={{ fontSize: 11, fontWeight: b.grade === cii.grade ? 900 : 600, color: b.grade === cii.grade ? b.color : muted, marginTop: 4 }}>{b.grade}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <EmptyNote title="계산할 수 없습니다" desc="선종이 CII 분류에 해당하지 않거나 총톤수(GT) 정보가 없습니다." />
                )}
              </Panel>

              <Panel title="연료 소모 추정" badge={<Pill text="모델 추정" tone="blue" />}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 10px" }}>
                  <Cell label="연료 종류" value={view?.fuelType ?? DASH} accent={LT.blue} />
                  <Cell label="총톤수" value={view?.grossTonnage != null ? fmt(view.grossTonnage) : DASH} unit="GT" />
                  <Cell label="시간당" value={view ? Math.round(view.fuelRateTonPerHour * 1000).toString() : DASH} unit="kg/h" />
                  <Cell label="하루" value={view ? view.dfocEstTonPerDay.toFixed(1) : DASH} unit="t/day" accent={LT.amber} />
                </div>
                <div style={{ fontSize: 11, color: muted, marginTop: 12 }}>선종·톤수 기반 소모 추정치입니다 (IMO GHG 방법론).</div>
              </Panel>

              <Panel title="태풍 모니터링" badge={<Pill text="기상청" tone="blue" />}>
                {typhoonLoading ? (
                  <EmptyNote title="태풍 정보를 확인하는 중입니다" desc="기상청 태풍정보를 불러오고 있습니다." />
                ) : typhoonError ? (
                  <EmptyNote title="태풍 정보를 불러오지 못했습니다" desc="잠시 후 자동으로 다시 확인합니다." />
                ) : !typhoons || typhoons.length === 0 ? (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "rgba(22,163,74,.10)" }}>
                      <span style={{ fontSize: 18, fontWeight: 900, color: LT.green }}>✓</span>
                      <span>
                        <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>영향권 태풍 없음</span>
                        <span style={{ display: "block", fontSize: 11, color: muted }}>최근 3일 발표 기준</span>
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: muted, marginTop: 10 }}>태풍이 발생하면 진로와 부산항 도달 예상 시각을 이곳에 표시합니다.</div>
                  </>
                ) : (
                  typhoons.map((typhoon, i) => {
                    const point = latestTyphoonPoint(typhoon);
                    return (
                      <div key={typhoon.typhoonId} style={{ padding: "8px 0", borderTop: i > 0 ? `1px solid ${LT.borderColor}` : "none" }}>
                        <div style={{ fontSize: 13, fontWeight: 800 }}>{typhoon.nameKr ? `${typhoon.nameKr} (${typhoon.name})` : typhoon.name}</div>
                        <div style={{ fontSize: 11, color: LT.red, fontWeight: 700, marginTop: 2 }}>
                          {point ? latLonText(point.lat, point.lon) : "좌표 없음"} · {typhoon.status}
                        </div>
                        <div style={{ fontSize: 10.5, color: muted, marginTop: 2 }}>
                          {point?.maxWindSpeedMs != null ? `최대풍속 ${point.maxWindSpeedMs}m/s` : "최대풍속 -"} · {point ? kst(point.time) : DASH}
                        </div>
                      </div>
                    );
                  })
                )}
              </Panel>
            </div>

            {/* 입출항 기록 + 속도별 탄소배출 효율 */}
            <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
              <Panel title="입출항 기록" badge={<Pill text="Port-MIS 신고 기준" tone="blue" />} style={{ flex: "1 1 420px" }}>
                <div style={{ display: "flex" }}>
                  {steps.map((st, i) => {
                    const color = st.state === "next" ? LT.borderColor : st.state === "now" ? LT.green : LT.blue;
                    return (
                      <div key={i} style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <span
                            style={{
                              width: st.state === "now" ? 14 : 10,
                              height: st.state === "now" ? 14 : 10,
                              flex: "none",
                              borderRadius: "50%",
                              background: st.state === "next" ? "#fff" : color,
                              border: st.state === "next" ? "2px solid #c0c9d6" : "none",
                            }}
                          />
                          {i < steps.length - 1 && <span style={{ flex: 1, height: 2, background: steps[i + 1].state === "next" ? LT.borderColor : LT.blue }} />}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: st.state === "now" ? 800 : 600, color: st.state === "next" ? muted : ink, marginTop: 8, paddingRight: 8 }}>{st.title}</div>
                        <div style={{ fontSize: 11, color: st.state === "now" ? LT.green : muted, fontWeight: st.state === "now" ? 800 : 500 }}>{st.sub}</div>
                      </div>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="속도별 탄소배출 효율" badge={<Pill text="시뮬레이션" tone="blue" />} style={{ flex: "1 1 520px" }}>
                {ciiCurve && selectedPt ? (
                  <>
                    <div style={{ height: 170 }}>
                      <CiiSpeedChart data={ciiCurvePoints} selectedPoint={selectedPt} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: muted, whiteSpace: "nowrap" }}>접근 속도</span>
                      <input
                        type="range"
                        min={ciiCurvePoints[0]?.speed ?? 4}
                        max={ciiCurvePoints[ciiCurvePoints.length - 1]?.speed ?? 24}
                        step={0.5}
                        value={plannedSpeed}
                        onChange={(e) => setPlannedSpeed(Number(e.target.value))}
                        style={{ flex: 1, accentColor: "#f59e0b" }}
                      />
                      <span style={{ fontSize: 14, fontWeight: 900, color: "#d97706", minWidth: 48, textAlign: "right" }}>{plannedSpeed.toFixed(1)}kn</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: LT.inkSoft }}>CII {selectedPt.cii.toFixed(3)}</span>
                    </div>
                  </>
                ) : (
                  <EmptyNote title="항해 중일 때 표시됩니다" desc="AIS 위치·속도와 톤수 정보가 있어야 접근 구간의 속도별 CII를 계산할 수 있습니다." />
                )}
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 화면 전용 소품 ──
const card: CSSProperties = { background: panel, borderRadius: 18, boxShadow: LT.shadow };

function StatusChip({ status }: { status: VesselView["status"] }) {
  const tone = status === "underway" ? { c: LT.blue, bg: LT.blueSoft } : status === "moored" ? { c: LT.green, bg: "rgba(22,163,74,.12)" } : { c: "#b45309", bg: "rgba(232,149,43,.14)" };
  return <span style={{ flex: "none", fontSize: 11, fontWeight: 800, color: tone.c, background: tone.bg, padding: "3px 8px", borderRadius: 999 }}>{STATUS_LABEL[status]}</span>;
}

function RoutePort({ caption, name, color }: { caption: string; name: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: muted, fontWeight: 600 }}>{caption}</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: color ?? ink }}>{name}</div>
    </div>
  );
}

function Caption({ children, color }: { children: ReactNode; color?: string }) {
  return <span style={{ fontSize: 11, color: color ?? muted }}>{children}</span>;
}

function EmptyNote({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, padding: "14px 8px" }}>
      <span style={{ fontSize: 14, fontWeight: 800, color: ink }}>{title}</span>
      <span style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>{desc}</span>
    </div>
  );
}
