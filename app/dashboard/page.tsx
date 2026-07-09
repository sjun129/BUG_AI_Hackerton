"use client";

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import dynamic from "next/dynamic";
import type { CongestionForecast, PortCall, RegionCongestionSeries, Ship } from "@/frontend/types/domain";
import { BUSAN_DISPLAY_PORT, congestionDisplayColor, congestionDisplayLabel } from "@/frontend/config/ports";
import VesselPanel from "@/frontend/components/VesselPanel";
import AdvisorPanel from "@/frontend/components/AdvisorPanel";
import SpeedAdvisoryCard from "@/frontend/components/SpeedAdvisoryCard";
import LeftRail from "@/frontend/components/LeftRail";
import { BASEMAPS, BASEMAP_STORAGE, initialBasemapId, type Basemap } from "@/frontend/components/basemaps";
import { RIGHT_PANEL_LEFT_EDGE } from "@/frontend/components/layout";
import { filterShipsMatchingPortMis } from "@/frontend/utils/match-position";
import { LT } from "@/frontend/components/theme";

// Leaflet은 window에 의존하므로 서버에서 렌더링하면 안 된다.
const ShipMap = dynamic(() => import("@/frontend/components/ShipMap"), { ssr: false });

const muted = LT.muted;
const panel = LT.panel;
const border = LT.border;

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

// "표시 항목" 카테고리 — 사이트 안에서 화면 오버레이를 켜고 끈다.
type LayerKey = "vessels" | "congestion" | "advisory";
const LAYER_ITEMS: { key: LayerKey; label: string; icon: string }[] = [
  { key: "vessels", label: "선박 패널", icon: "🚢" },
  { key: "congestion", label: "혼잡도", icon: "📊" },
  { key: "advisory", label: "감속 권고", icon: "⚓" },
];
const LAYERS_STORAGE = "portiq.layers";

// localStorage 저장 — SSR 가드를 한 곳으로 모은다.
function saveLocal(key: string, value: string) {
  if (typeof window !== "undefined") window.localStorage.setItem(key, value);
}

function initialLayers(): Record<LayerKey, boolean> {
  const def: Record<LayerKey, boolean> = { vessels: true, congestion: true, advisory: true };
  if (typeof window === "undefined") return def;
  try {
    const saved = JSON.parse(window.localStorage.getItem(LAYERS_STORAGE) || "null");
    return saved ? { ...def, ...saved } : def;
  } catch {
    return def;
  }
}

// 우측 레일 플라이아웃 공용 스타일
const flyoutHeader: CSSProperties = { padding: "4px 8px 6px", fontSize: 10.5, fontWeight: 800, letterSpacing: ".08em", color: muted };
const flyoutRow: CSSProperties = {
  position: "relative",
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 9,
  padding: "8px 10px",
  fontSize: 12.5,
  fontWeight: 700,
  textAlign: "left",
  border: "none",
  borderRadius: 8,
};

// 하단 툴바의 아이콘 버튼 + 위로 열리는 플라이아웃 패널
function RailButton({
  icon,
  label,
  active,
  onClick,
  children,
}: {
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={onClick}
        title={label}
        style={{
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          borderRadius: 10,
          cursor: "pointer",
          border: "none",
          color: active ? "#fff" : muted,
          background: active ? "linear-gradient(135deg,#2f6bff,#5b8cff)" : "transparent",
        }}
      >
        {icon}
      </button>
      {active && (
        <div
          style={{
            position: "absolute",
            bottom: 48,
            left: "50%",
            transform: "translateX(-50%)",
            width: 184,
            padding: 6,
            background: "rgba(255,255,255,0.97)",
            backdropFilter: "blur(14px)",
            border,
            borderRadius: 12,
            boxShadow: LT.shadow,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [ships, setShips] = useState<Ship[]>([]);
  const [congestion, setCongestion] = useState<CongestionForecast | null>(null);
  const [regions, setRegions] = useState<RegionCongestionSeries[]>([]);
  const [portCalls, setPortCalls] = useState<PortCall[]>([]);
  const [selectedMmsi, setSelectedMmsi] = useState<string | null>(null);
  const [selectedVessel, setSelectedVessel] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(initialLayers);
  const [basemapId, setBasemapId] = useState<string>(initialBasemapId);
  const [openMenu, setOpenMenu] = useState<null | "map" | "layers">(null);

  function toggleLayer(k: LayerKey) {
    setLayers((prev) => {
      const next = { ...prev, [k]: !prev[k] };
      saveLocal(LAYERS_STORAGE, JSON.stringify(next));
      return next;
    });
  }

  function selectBasemap(b: Basemap) {
    if (!b.url) return; // 비활성(설정 필요) 항목은 무시
    setBasemapId(b.id);
    setOpenMenu(null);
    saveLocal(BASEMAP_STORAGE, b.id);
  }

  const currentBasemap = BASEMAPS.find((b) => b.id === basemapId) ?? BASEMAPS[0];

  useEffect(() => {
    let active = true;
    async function load() {
      const [s, cg, pc, rg] = await Promise.all([
        fetch("/api/ships").then((r) => r.json()),
        fetch("/api/congestion").then((r) => r.json()),
        fetch("/api/port-calls").then((r) => r.json()),
        fetch("/api/congestion/regions").then((r) => r.json()),
      ]);
      if (!active) return;
      setShips(Array.isArray(s) ? s : []);
      setCongestion(cg && cg.forecast ? cg : null);
      setPortCalls(Array.isArray(pc) ? pc : []);
      setRegions(Array.isArray(rg) ? rg : []);
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
  const shownShips = useMemo(() => filterShipsMatchingPortMis(ships, portCalls), [ships, portCalls]);

  return (
    <div style={{ position: "fixed", inset: 0, background: LT.pageBg, overflow: "hidden", fontFamily: "Pretendard, system-ui, sans-serif" }}>
      {/* 배경 지도 */}
      <div style={{ position: "absolute", inset: 0 }}>
        <ShipMap ships={shownShips} selectedMmsi={selectedMmsi} onSelect={setSelectedMmsi} regions={regions} basemapId={basemapId} />
      </div>

      {/* 좌측 아이콘 레일 */}
      <LeftRail active="/dashboard" />

      {/* 하단 중앙 가로 툴바 — 지도 타입 / 표시 항목 (위로 펼침) */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 600,
          display: "flex",
          flexDirection: "row",
          gap: 6,
          padding: "6px 8px",
          background: panel,
          backdropFilter: "blur(14px)",
          border,
          borderRadius: 14,
          boxShadow: LT.shadow,
        }}
      >
        {/* 지도 타입 */}
        <RailButton
          icon={currentBasemap.icon}
          label="지도 타입"
          active={openMenu === "map"}
          onClick={() => setOpenMenu((v) => (v === "map" ? null : "map"))}
        >
          <div style={flyoutHeader}>지도 타입</div>
          {BASEMAPS.map((b) => {
            const on = b.id === currentBasemap.id;
            const disabled = !b.url;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => selectBasemap(b)}
                disabled={disabled}
                title={disabled ? b.note : `배경: ${b.label}`}
                style={{
                  ...flyoutRow,
                  color: disabled ? "#94a3b8" : on ? LT.blue : LT.inkSoft,
                  background: on ? LT.blueSoft : "transparent",
                  cursor: disabled ? "not-allowed" : "pointer",
                  marginTop: b.separator ? 6 : 0,
                  borderTop: b.separator ? `1px solid ${LT.borderColor}` : "none",
                  paddingTop: b.separator ? 12 : 8,
                }}
              >
                <span style={{ fontSize: 14, width: 16, textAlign: "center", opacity: disabled ? 0.5 : 1 }}>{b.icon}</span>
                <span style={{ flex: 1 }}>{b.label}</span>
                {on && <span style={{ position: "absolute", right: 4, top: 8, bottom: 8, width: 3, borderRadius: 2, background: LT.blue }} />}
              </button>
            );
          })}
        </RailButton>

        {/* 표시 항목 */}
        <RailButton
          icon="🧭"
          label="표시 항목"
          active={openMenu === "layers"}
          onClick={() => setOpenMenu((v) => (v === "layers" ? null : "layers"))}
        >
          <div style={flyoutHeader}>표시 항목</div>
          {LAYER_ITEMS.map((item) => {
            const on = layers[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleLayer(item.key)}
                style={{ ...flyoutRow, color: on ? LT.blue : LT.muted, background: on ? LT.blueSoft : "transparent", cursor: "pointer" }}
              >
                <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                <span style={{ fontSize: 12, color: on ? LT.blue : "rgba(15,23,42,.2)" }}>{on ? "✓" : ""}</span>
              </button>
            );
          })}
        </RailButton>
      </div>

      {/* 상단 텔레메트리 바 (항만 종합 현황) */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 500,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "10px 22px",
          background: panel,
          backdropFilter: "blur(14px)",
          border,
          borderRadius: 14,
          boxShadow: LT.shadow,
          color: LT.ink,
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

      {/* 좌상단 감속 권고 카드 (혼잡도 기반 JIT 연료저감) */}
      {layers.advisory && <SpeedAdvisoryCard level={level} />}

      {/* 우측 선박 패널 */}
      {layers.vessels && <VesselPanel calls={portCalls} selectedKey={selectedVessel} onSelect={setSelectedVessel} />}

      {/* 좌하단 항만별 혼잡도 패널 (지역별 AIS 통계 혼잡도 + 범례) */}
      {layers.congestion && regions.length > 0 && (
        <div
          style={{
            position: "absolute",
            left: 84,
            bottom: 16,
            maxWidth: "calc(100vw - 480px)",
            zIndex: 500,
            padding: "14px 18px 12px",
            background: panel,
            backdropFilter: "blur(14px)",
            border,
            borderRadius: 16,
            boxShadow: LT.shadow,
            color: LT.ink,
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 800, color: muted, letterSpacing: ".04em", marginBottom: 12 }}>항만별 혼잡도</div>
          <div style={{ display: "flex", gap: 26 }}>
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
      )}

      {/* AI 어드바이저 FAB — 선박 패널 왼쪽 하단 */}
      <AdvisorPanel right={RIGHT_PANEL_LEFT_EDGE + 14} />
    </div>
  );
}
