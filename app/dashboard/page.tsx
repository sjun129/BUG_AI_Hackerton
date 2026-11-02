"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import type { CongestionForecast, PortCall, RegionCongestionSeries, Ship } from "@/frontend/types/domain";
import { BUSAN_DISPLAY_PORT, congestionDisplayColor, congestionDisplayLabel } from "@/frontend/config/ports";
import VesselPanel from "@/frontend/components/VesselPanel";
import AdvisorPanel from "@/frontend/components/AdvisorPanel";
import SpeedAdvisoryCard from "@/frontend/components/SpeedAdvisoryCard";
import LeftRail, { ImgIcon, RAIL_OFFSET, RailItemView } from "@/frontend/components/LeftRail";
import { CloseButton, GaugeIcon, LayersIcon, PanelBubble } from "@/frontend/components/PanelControls";
import { BASEMAPS, BASEMAP_STORAGE, defaultBasemapId, savedBasemapId, type Basemap } from "@/frontend/components/basemaps";
import { filterShipsMatchingPortMis } from "@/frontend/utils/match-position";
import { deadReckon } from "@/frontend/utils/dead-reckoning";
import { LT } from "@/frontend/components/theme";

// Leaflet은 window에 의존하므로 서버에서 렌더링하면 안 된다.
const ShipMap = dynamic(() => import("@/frontend/components/ShipMap"), { ssr: false });

const muted = LT.muted;
const panel = LT.panel;
const border = LT.border;

// 오른쪽 열(선박 패널 + 감속 권고)과 왼쪽 아래 혼잡도 카드의 크기 — 하단 AI 입력창 구간 계산에 쓴다.
const RIGHT_COLUMN_WIDTH = 380;
const RIGHT_EDGE = 16 + RIGHT_COLUMN_WIDTH + 16;
const PORT_CARD_WIDTH = 420;

function congestionColor(level: number): string {
  return congestionDisplayColor(level);
}

// 상단 텔레메트리 바의 지표 한 칸
function Metric({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 62 }}>
      <div style={{ fontSize: 10.5, color: muted, fontWeight: 700, letterSpacing: ".04em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: accent ?? LT.ink, lineHeight: 1.2 }}>
        {value}
        {unit && <span style={{ fontSize: 11, color: muted, marginLeft: 2 }}>{unit}</span>}
      </div>
    </div>
  );
}

// 패널 열림 상태 — X로 닫으면 버블로 접히고, 버블을 누르면 다시 열린다. 브라우저에 기억한다.
type PanelKey = "vessels" | "congestion" | "advisory";
const PANELS_STORAGE = "portiq.layers";
const DEFAULT_PANELS: Record<PanelKey, boolean> = { vessels: true, congestion: true, advisory: true };

// localStorage 저장 — SSR 가드를 한 곳으로 모은다.
function saveLocal(key: string, value: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, value);
}

// 저장된 패널 상태. localStorage를 읽으므로 마운트 후(useEffect)에만 호출한다(하이드레이션 불일치 방지).
function savedPanels(): Record<PanelKey, boolean> {
  try {
    const saved = JSON.parse(window.localStorage.getItem(PANELS_STORAGE) || "null");
    return saved ? { ...DEFAULT_PANELS, ...saved } : DEFAULT_PANELS;
  } catch {
    return DEFAULT_PANELS;
  }
}

// 지도 타입 선택창의 미리보기 견본과 설명
const BASEMAP_PREVIEW: Record<string, { swatch: string; desc: string }> = {
  base: { swatch: "#ede8df", desc: "VWorld 기본 지도" },
  light: { swatch: "#f2f3f5", desc: "밝은 배경 · 관제용" },
  dark: { swatch: "#1e293b", desc: "야간 관제용" },
  satellite: { swatch: "linear-gradient(135deg,#455c40,#8c8061)", desc: "항공 사진 + 지명" },
  enc: { swatch: "#cfe3f3", desc: "국립해양조사원 전자해도" },
};

const floating: CSSProperties = {
  background: panel,
  backdropFilter: "blur(14px)",
  border,
  borderRadius: 18,
  boxShadow: LT.shadow,
  color: LT.ink,
};

export default function DashboardPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [congestion, setCongestion] = useState<CongestionForecast | null>(null);
  const [regions, setRegions] = useState<RegionCongestionSeries[]>([]);
  const [portCalls, setPortCalls] = useState<PortCall[]>([]);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [panels, setPanels] = useState<Record<PanelKey, boolean>>(DEFAULT_PANELS);
  const [basemapId, setBasemapId] = useState<string>(defaultBasemapId);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  // 첫 렌더는 서버와 같은 기본값으로 하고, 저장된 사용자 설정은 마운트 후 복원한다.
  useEffect(() => {
    setPanels(savedPanels());
    const saved = savedBasemapId();
    if (saved) setBasemapId(saved);
  }, []);

  function setPanel(k: PanelKey, open: boolean) {
    setPanels((prev) => {
      const next = { ...prev, [k]: open };
      saveLocal(PANELS_STORAGE, JSON.stringify(next));
      return next;
    });
  }

  function selectBasemap(b: Basemap) {
    if (!b.url) return; // 비활성(설정 필요) 항목은 무시
    setBasemapId(b.id);
    setMapMenuOpen(false);
    saveLocal(BASEMAP_STORAGE, b.id);
  }

  useEffect(() => {
    let active = true;
    // 각 API를 도착하는 대로 반영한다 — 느린 혼잡도 API가 선박·Port-MIS 표시를 막지 않도록.
    // 실패한 요청은 이전 값을 유지한다.
    function load() {
      const get = (url: string, apply: (data: unknown) => void) =>
        fetch(url)
          .then((r) => r.json())
          .then((data) => active && apply(data))
          .catch(() => {});
      get("/api/ships", (s) => setShips(Array.isArray(s) ? s : []));
      get("/api/port-calls", (pc) => setPortCalls(Array.isArray(pc) ? pc : []));
      get("/api/congestion", (cg) => setCongestion(cg && (cg as CongestionForecast).forecast ? (cg as CongestionForecast) : null));
      get("/api/congestion/regions", (rg) => setRegions(Array.isArray(rg) ? rg : []));
    }
    load();
    const timer = setInterval(load, 30_000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const portCallCounts = useMemo(
    () =>
      portCalls.reduce(
        (acc, call) => {
          if (call.berthType === "접안") acc.berthed += 1;
          else if (call.berthType === "묘박") acc.anchoredPm += 1;
          return acc;
        },
        { berthed: 0, anchoredPm: 0 }
      ),
    [portCalls]
  );
  const level = congestion?.currentLevel ?? 0;

  // Port-MIS(공식 정박선)와 호출부호·선박명 유사도로 매칭되는 AIS 선박만 지도에 표시한다.
  // → 오래된/무관한 유령 위치를 걸러내고 공식 기록에 있는 배의 위치만 남긴다.
  const matchedShips = useMemo(() => filterShipsMatchingPortMis(ships, portCalls), [ships, portCalls]);

  // AIS 스냅샷이 실시간이 아니므로, 항해 중인 배를 페이지를 연 뒤 경과 시간만큼 침로·속력대로 옮겨 보여준다.
  // 30초마다 선박을 다시 받아도 기준은 페이지 진입 시각이라 위치가 되돌아가지 않는다.
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => setElapsedMs(Date.now() - start), 3_000);
    return () => clearInterval(timer);
  }, []);
  const shownShips = useMemo(() => matchedShips.map((s) => deadReckon(s, elapsedMs)), [matchedShips, elapsedMs]);

  // 버블 배지: 가장 혼잡한 항만
  const busiest = regions.reduce<RegionCongestionSeries | null>((m, r) => (!m || r.currentLevel > m.currentLevel ? r : m), null);
  const showPortCard = panels.congestion && regions.length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, background: LT.pageBg, overflow: "hidden", fontFamily: "Pretendard, system-ui, sans-serif" }}>
      {/* 배경 지도 */}
      <div style={{ position: "absolute", inset: 0 }}>
        <ShipMap ships={shownShips} selectedMmsi={selectedMmsi} onSelect={setSelectedMmsi} regions={regions} basemapId={basemapId} />
      </div>

      {/* 왼쪽 메뉴 — 맨 아래 '지도 타입' 버튼 */}
      <LeftRail
        active="/dashboard"
        bottom={<RailItemView icon={LayersIcon} label="지도 타입" on={mapMenuOpen} onClick={() => setMapMenuOpen((v) => !v)} />}
      />

      {/* 지도 타입 선택창 — 메뉴 오른쪽 아래에 열린다 */}
      {mapMenuOpen && (
        <div style={{ ...floating, position: "absolute", left: RAIL_OFFSET - 4, bottom: 16, zIndex: 800, width: 300, padding: "14px 12px", background: "#fff" }}>
          <div style={{ padding: "0 6px 8px" }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>지도 타입</div>
            <div style={{ fontSize: 12, color: muted }}>배경 지도를 선택하세요</div>
          </div>
          {BASEMAPS.map((b) => {
            const on = b.id === basemapId;
            const disabled = !b.url;
            const preview = BASEMAP_PREVIEW[b.id];
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBasemap(b)}
                disabled={disabled}
                title={disabled ? b.note : `배경: ${b.label}`}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: 8,
                  marginTop: b.separator ? 6 : 0,
                  borderTop: b.separator ? `1px solid ${LT.borderColor}` : "none",
                  border: "none",
                  borderRadius: 12,
                  background: on ? LT.blueSoft : "transparent",
                  opacity: disabled ? 0.45 : 1,
                  cursor: disabled ? "not-allowed" : "pointer",
                  textAlign: "left",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 52,
                    height: 38,
                    flex: "none",
                    borderRadius: 8,
                    background: preview?.swatch ?? LT.tile,
                    border: on ? `2px solid ${LT.blue}` : `1px solid ${LT.borderColor}`,
                  }}
                />
                <span style={{ flex: 1 }}>
                  <span style={{ display: "block", fontSize: 14, fontWeight: 800, color: on ? LT.blue : LT.ink }}>{b.label}</span>
                  <span style={{ display: "block", fontSize: 11, color: muted }}>{preview?.desc}{disabled ? " · 설정 필요" : ""}</span>
                </span>
                {on && <span style={{ color: LT.blue, fontWeight: 900 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* 상단 현황 바 (항만 종합 현황) */}
      <div
        style={{
          ...floating,
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 22px",
          borderRadius: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", marginRight: 4 }}>
          <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: "-.01em" }}>PORTIQ</span>
          <span style={{ fontSize: 10, color: muted, fontWeight: 700 }}>{BUSAN_DISPLAY_PORT.name} 실시간 관제</span>
        </div>
        <div style={{ width: 1, height: 30, background: LT.borderColor }} />
        <Metric label="정박" value={String(portCalls.length)} unit="척" />
        <Metric label="접안" value={String(portCallCounts.berthed)} unit="척" accent={LT.green} />
        <Metric label="묘박" value={String(portCallCounts.anchoredPm)} unit="척" accent={LT.amber} />
        <Metric label="AIS 위치" value={String(shownShips.length)} unit="척" accent={LT.sky} />
        <div style={{ width: 1, height: 30, background: LT.borderColor }} />
        <Metric label="혼잡도" value={String(Math.round(level * 100))} unit="%" accent={congestionColor(level)} />
      </div>

      {/* 오른쪽 열 — 위: 선박 패널, 아래: 감속 권고. 닫으면 각 자리에 버블이 남는다. */}
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          bottom: 16,
          width: RIGHT_COLUMN_WIDTH,
          zIndex: 500,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 16,
          pointerEvents: "none",
        }}
      >
        <div style={{ pointerEvents: "auto", width: panels.vessels ? "100%" : undefined, flex: panels.vessels ? 1 : "none", minHeight: 0, display: "flex", flexDirection: "column" }}>
          {panels.vessels ? (
            <VesselPanel calls={portCalls} selectedKey={selectedVessel} onSelect={setSelectedVessel} onClose={() => setPanel("vessels", false)} />
          ) : (
            <PanelBubble
              icon={<ImgIcon src="/icons/ship.png" size={30} />}
              label="선박 목록"
              badge={String(portCalls.length)}
              tone={LT.blue}
              softTone={LT.blueSoft}
              onClick={() => setPanel("vessels", true)}
            />
          )}
        </div>
        <div style={{ pointerEvents: "auto", width: panels.advisory ? "100%" : undefined, marginTop: "auto" }}>
          {panels.advisory ? (
            <SpeedAdvisoryCard level={level} onClose={() => setPanel("advisory", false)} />
          ) : (
            <PanelBubble icon={GaugeIcon} label="감속 권고" tone={LT.green} softTone="rgba(22,163,74,.12)" onClick={() => setPanel("advisory", true)} />
          )}
        </div>
      </div>

      {/* 왼쪽 아래 항만별 혼잡도 (지역별 AIS 통계 혼잡도 + 범례) */}
      {showPortCard ? (
        <div style={{ ...floating, position: "absolute", left: RAIL_OFFSET, bottom: 16, width: PORT_CARD_WIDTH, zIndex: 500, padding: "14px 18px 12px", borderRadius: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: muted, letterSpacing: ".04em" }}>항만별 혼잡도</span>
            <CloseButton onClick={() => setPanel("congestion", false)} label="항만별 혼잡도 닫기" />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16 }}>
            {regions.map((r) => (
              <div key={r.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ width: 11, height: 11, borderRadius: "50%", background: congestionColor(r.currentLevel), flex: "none" }} />
                  <span style={{ fontSize: 17, fontWeight: 800 }}>{r.name}</span>
                </div>
                <div style={{ fontSize: 13, color: muted, fontWeight: 600, marginTop: 3, marginLeft: 18 }}>
                  {congestionDisplayLabel(r.currentLevel)} · {Math.round(r.currentLevel * 100)}%
                </div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: LT.borderColor, margin: "12px 0 10px" }} />
          <div style={{ display: "flex", gap: 18, fontSize: 12.5, fontWeight: 700, color: LT.inkSoft }}>
            {[
              [LT.green, "원활"],
              [LT.amber, "보통"],
              [LT.red, "혼잡"],
            ].map(([c, t]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: c }} />
                {t}
              </div>
            ))}
          </div>
        </div>
      ) : (
        regions.length > 0 && (
          <div style={{ position: "absolute", left: RAIL_OFFSET, bottom: 24, zIndex: 500 }}>
            <PanelBubble
              icon={<ImgIcon src="/icons/chart.png" size={30} />}
              label="혼잡도"
              badge={busiest ? `${Math.round(busiest.currentLevel * 100)}%` : undefined}
              tone={busiest ? congestionColor(busiest.currentLevel) : LT.green}
              softTone="rgba(239,68,68,.10)"
              onClick={() => setPanel("congestion", true)}
            />
          </div>
        )
      )}

      {/* 하단 AI 어드바이저 — 패널을 열고 닫아도 움직이지 않도록 왼쪽 혼잡도 카드와 오른쪽 열 사이 구간에 고정 */}
      <AdvisorPanel left={RAIL_OFFSET + PORT_CARD_WIDTH + 16} right={RIGHT_EDGE} />
    </div>
  );
}
