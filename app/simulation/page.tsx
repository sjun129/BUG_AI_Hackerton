"use client";

import dynamic from "next/dynamic";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { BUSAN_DISPLAY_PORT, SIMULATION_DESTINATION_PORTS } from "@/frontend/config/ports";
import LeftRail from "@/frontend/components/LeftRail";
import ClimateOverridePanel from "@/frontend/components/simulation/ClimateOverridePanel";
import LiveShipImportModal from "@/frontend/components/simulation/LiveShipImportModal";
import RouteScenarioResults from "@/frontend/components/simulation/RouteScenarioResults";
import SimulatedShipModal from "@/frontend/components/SimulatedShipModal";
import { LT } from "@/frontend/components/theme";
import { useRouteScenarios } from "@/frontend/hooks/useRouteScenarios";
import { useSimulatedShips } from "@/frontend/hooks/useSimulatedShips";
import type { ClimateOverrideInput, RouteScenarioBaselineOverlay, RouteScenarioMapOverlay } from "@/frontend/types/route-scenario";
import type { NewSimulatedShipInput, ScenarioShipSource, SimulatedShip } from "@/frontend/types/simulation";
import { SIMULATED_VESSEL_TYPE_LABELS } from "@/frontend/types/simulation";

const SimulationMap = dynamic(() => import("@/frontend/components/SimulationMap"), { ssr: false });

const muted = LT.muted;
const panel = LT.panelSolid;
const border = LT.border;

function nextDefaultName(ships: SimulatedShip[]): string {
  const maxNumber = ships.reduce((max, ship) => {
    const match = /^SIM VESSEL (\d+)$/i.exec(ship.name.trim());
    if (!match) return max;
    return Math.max(max, Number(match[1]) || 0);
  }, 0);
  return `SIM VESSEL ${String(maxNumber + 1).padStart(2, "0")}`;
}

function formatGt(value: number): string {
  return value.toLocaleString("ko-KR");
}

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

function simulationDestinationShort(destinationPortId: string | undefined): string {
  return SIMULATION_DESTINATION_PORTS.find((destination) => destination.id === destinationPortId)?.shortName ?? "북항";
}

// 라이트 카드 공용 스타일.
const cardStyle: CSSProperties = {
  padding: 16,
  borderRadius: 16,
  border,
  background: panel,
  boxShadow: LT.shadow,
};

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
        background: snapshot ? "rgba(37,99,235,.12)" : "rgba(232,149,43,.14)",
        color: snapshot ? LT.blue : LT.amber,
        fontSize: 10,
        fontWeight: 900,
        letterSpacing: ".06em",
      }}
    >
      {snapshot ? "LIVE SNAPSHOT" : "SIM"}
    </span>
  );
}

// 가상 선박 아이콘 타일 — 시안의 둥근 사각형 배지.
function ShipTile({ snapshot }: { snapshot: boolean }) {
  return (
    <div
      style={{
        width: 44,
        height: 44,
        flex: "none",
        borderRadius: 12,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 20,
        background: snapshot ? "rgba(37,99,235,.10)" : LT.tile,
      }}
    >
      🚢
    </div>
  );
}

// 섹션 헤더 + 우측 실행 버튼.
function PanelHeader({ title, desc, action }: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: LT.ink }}>{title}</h2>
        {desc && <p style={{ margin: "7px 0 0", color: muted, fontSize: 11.5, lineHeight: 1.5 }}>{desc}</p>}
      </div>
      {action}
    </div>
  );
}

function RunButton({ label, onClick, disabled, tone }: { label: string; onClick: () => void; disabled?: boolean; tone: "blue" | "green" }) {
  const base = tone === "green" ? LT.green : LT.blue;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: "none",
        height: 38,
        padding: "0 15px",
        borderRadius: 10,
        border: "none",
        background: disabled ? "#cbd5e1" : base,
        color: "#fff",
        fontSize: 12.5,
        fontWeight: 800,
        cursor: disabled ? "wait" : "pointer",
        boxShadow: disabled ? "none" : `0 6px 16px ${tone === "green" ? "rgba(22,163,74,.28)" : "rgba(37,99,235,.28)"}`,
      }}
    >
      {label}
    </button>
  );
}

function EmptyState() {
  return (
    <div
      style={{
        border: `1px dashed ${LT.borderColor}`,
        borderRadius: 12,
        padding: "24px 14px",
        color: muted,
        fontSize: 13,
        lineHeight: 1.6,
        textAlign: "center",
      }}
    >
      생성 모드를 켠 뒤 지도에서 위치를 우클릭하면 가상 선박을 추가할 수 있습니다.
    </div>
  );
}

export default function SimulationPage() {
  const { simulatedShips, hydrated, addSimulatedShip, removeSimulatedShip, clearSimulatedShips } = useSimulatedShips();
  const [simulationMode, setSimulationMode] = useState(true);
  const [pendingPosition, setPendingPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [liveImportOpen, setLiveImportOpen] = useState(false);
  const [climateOverride, setClimateOverride] = useState<ClimateOverrideInput>({ enabled: false });
  const {
    result: routeResult,
    loading: routeLoading,
    error: routeError,
    notice: routeNotice,
    calculateRouteScenarios,
    resetRouteScenarios,
  } = useRouteScenarios();

  const defaultName = useMemo(() => nextDefaultName(simulatedShips), [simulatedShips]);
  const routeOverlays = useMemo<RouteScenarioMapOverlay[]>(() => {
    if (!routeResult) return [];
    return routeResult.results.flatMap((shipResult) =>
      shipResult.routeScenarios
        .filter((scenario) => scenario.routePolyline.points.length >= 2)
        .map((scenario) => ({
          shipId: shipResult.shipId ?? shipResult.shipName,
          routeId: scenario.routeId,
          routeName: scenario.routeName,
          routeSource: scenario.routeSource,
          isRecommended: scenario.isRecommended,
          points: scenario.routePolyline.points,
          distanceNm: scenario.distanceNm,
          eta: scenario.eta,
          score: scenario.score,
        }))
    );
  }, [routeResult]);

  const baselineRouteOverlays = useMemo<RouteScenarioBaselineOverlay[]>(() => {
    if (!routeResult) return [];
    return routeResult.results
      .filter((shipResult) => (shipResult.baselineAiRoutePolyline?.points.length ?? 0) >= 2)
      .map((shipResult) => ({
        shipId: shipResult.shipId ?? shipResult.shipName,
        points: shipResult.baselineAiRoutePolyline!.points,
      }));
  }, [routeResult]);

  function createShip(input: NewSimulatedShipInput) {
    addSimulatedShip(input);
    setPendingPosition(null);
    setLiveImportOpen(false);
    resetRouteScenarios();
  }

  function removeShip(id: string) {
    removeSimulatedShip(id);
    resetRouteScenarios();
  }

  function clearAll() {
    if (simulatedShips.length === 0) return;
    clearSimulatedShips();
    resetRouteScenarios();
  }

  async function runRouteScenarios() {
    await calculateRouteScenarios(simulatedShips, climateOverride);
  }

  const shellStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    overflow: "hidden",
    background: LT.pageBg,
    color: LT.ink,
    fontFamily: "Pretendard, system-ui, sans-serif",
  };

  return (
    <div style={shellStyle}>
      <LeftRail active="/simulation" />

      <div style={{ position: "absolute", inset: "16px 16px 16px 84px", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(380px, 420px)", gap: 14 }}>
        <main style={{ position: "relative", minWidth: 0, border, borderRadius: 16, overflow: "hidden", background: panel, boxShadow: LT.shadow }}>
          <SimulationMap
            ships={simulatedShips}
            simulationMode={simulationMode}
            onMapContextMenu={setPendingPosition}
            routeOverlays={routeOverlays}
            baselineRouteOverlays={baselineRouteOverlays}
            climateOverrideTyphoon={routeResult?.climateOverrideTyphoon}
          />

          <section
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              zIndex: 500,
              width: "min(620px, calc(100% - 28px))",
              padding: 16,
              borderRadius: 14,
              border,
              background: "rgba(255,255,255,.94)",
              backdropFilter: "blur(14px)",
              boxShadow: LT.shadow,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <SimBadge />
                  <span style={{ color: LT.blue, fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>{BUSAN_DISPLAY_PORT.name} 운영자 검토용</span>
                </div>
                <h1 style={{ margin: "8px 0 0", fontSize: 25, lineHeight: 1.15, letterSpacing: "-.01em", fontWeight: 800, color: LT.ink }}>입항 시나리오 시뮬레이션</h1>
                <p style={{ margin: "9px 0 0", color: LT.inkSoft, fontSize: 13, lineHeight: 1.55 }}>
                  지도 우클릭으로 가상 선박을 생성하고 위치·속도·선종·총톤수 기준의 입항 시나리오를 구성합니다.
                  이 페이지의 선박은 실제 AIS/Port-MIS 선박이 아닌 시뮬레이션용 가상 데이터입니다.
                </p>
              </div>
              <label
                style={{
                  flex: "none",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: `1px solid ${simulationMode ? "rgba(37,99,235,.3)" : LT.borderColor}`,
                  background: simulationMode ? LT.blueSoft : LT.tile,
                  color: simulationMode ? LT.blue : muted,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <input type="checkbox" checked={simulationMode} onChange={(event) => setSimulationMode(event.target.checked)} style={{ accentColor: LT.blue }} />
                생성 모드
              </label>
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, padding: "9px 11px", borderRadius: 10, background: "rgba(232,149,43,.10)", color: "#9a6a12", fontSize: 12, fontWeight: 600, lineHeight: 1.45 }}>
              <span>⚠️</span>
              <span>
                실제 운항 지시가 아닌 시뮬레이션 시나리오입니다. 수동 선박은 사용자가 생성한 가상 선박이며, LIVE SNAPSHOT은 실제 선박 데이터를 수정하지 않고 복사한 항목입니다.
              </span>
            </div>
          </section>
        </main>

        <aside style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 12, overflowY: "auto", paddingRight: 2 }}>
          {/* 시뮬레이션 함대 관리 */}
          <section style={{ ...cardStyle, flex: "0 0 auto", display: "flex", flexDirection: "column", minHeight: 300, maxHeight: 460 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div>
                <div style={{ color: muted, fontSize: 11, fontWeight: 800, letterSpacing: ".06em" }}>SIMULATION FLEET</div>
                <div style={{ marginTop: 3, fontSize: 24, fontWeight: 800, color: LT.ink }}>
                  {hydrated ? simulatedShips.length : 0}
                  <span style={{ fontSize: 13, color: muted, fontWeight: 700, marginLeft: 3 }}>척</span>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => setLiveImportOpen(true)}
                  style={{ height: 36, padding: "0 13px", borderRadius: 10, border: "none", background: LT.blue, color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 16px rgba(37,99,235,.28)" }}
                >
                  실시간 불러오기
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={simulatedShips.length === 0}
                  style={{
                    height: 36,
                    padding: "0 13px",
                    borderRadius: 10,
                    border,
                    background: LT.tile,
                    color: simulatedShips.length === 0 ? "#a3aec1" : LT.inkSoft,
                    fontSize: 12.5,
                    fontWeight: 800,
                    cursor: simulatedShips.length === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  초기화
                </button>
              </div>
            </div>
            <p style={{ margin: "12px 0 0", color: muted, fontSize: 11.5, lineHeight: 1.5 }}>
              저장 위치는 브라우저 localStorage입니다. Supabase ships 테이블에는 저장하지 않으며, LIVE SNAPSHOT 항목은 원본 실제 선박 데이터를 수정하지 않습니다.
            </p>

            <div style={{ height: 1, background: LT.borderColor, margin: "14px 0 12px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: LT.ink }}>가상 선박 목록</h2>
              <span style={{ color: muted, fontSize: 11, fontWeight: 700 }}>운영자 검토용</span>
            </div>

            {!hydrated || simulatedShips.length === 0 ? (
              <EmptyState />
            ) : (
              <div style={{ display: "flex", flex: "1 1 auto", flexDirection: "column", gap: 9, overflowY: "auto", paddingRight: 2, minHeight: 0 }}>
                {simulatedShips.map((ship) => {
                  const destinationShort = simulationDestinationShort(ship.destinationPortId);
                  const snapshot = ship.source === "ais-snapshot";
                  const typeLabel = ship.vesselType ? SIMULATED_VESSEL_TYPE_LABELS[ship.vesselType] : "선종 -";
                  return (
                    <article
                      key={ship.id}
                      style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, borderRadius: 12, border, background: "#fff", padding: 12 }}
                    >
                      <ShipTile snapshot={snapshot} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontSize: 14, fontWeight: 800, color: LT.ink, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ship.name}</span>
                          {snapshot && <SimBadge source={ship.source} />}
                        </div>
                        <div style={{ marginTop: 3, color: muted, fontSize: 12 }}>
                          {typeLabel} · {ship.grossTonnage != null ? `${formatGt(ship.grossTonnage)} t` : "GT -"}
                        </div>
                      </div>
                      <div style={{ flex: "none", textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: LT.blue }}>{destinationShort}</div>
                        <div style={{ marginTop: 3, color: muted, fontSize: 12 }}>{ship.sog} kn</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeShip(ship.id)}
                        aria-label={`${ship.name} 삭제`}
                        title="삭제"
                        style={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          width: 22,
                          height: 22,
                          borderRadius: 7,
                          border: "none",
                          background: "transparent",
                          color: "#b6c0d0",
                          cursor: "pointer",
                          fontSize: 15,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* 친환경 입항 경로 추천 */}
          <section style={{ ...cardStyle, flex: "0 0 auto", display: "flex", flexDirection: "column", minHeight: 340 }}>
            <PanelHeader
              title="친환경 입항 경로 추천"
              desc="선택 도착지의 해수부 지정항로(항만가이드라인)를 거리·혼잡도·예상 대기·연료·CO₂ 기준으로 비교합니다."
              action={<RunButton label={routeLoading ? "계산 중" : "경로 추천 계산"} onClick={runRouteScenarios} disabled={routeLoading} tone="green" />}
            />
            <div style={{ marginTop: 12 }}>
              <ClimateOverridePanel value={climateOverride} onChange={setClimateOverride} />
            </div>
            {routeError && <div style={{ marginTop: 10, color: LT.red, fontSize: 12, fontWeight: 700 }}>{routeError}</div>}
            {routeNotice && <div style={{ marginTop: 10, color: "#9a6a12", fontSize: 12, lineHeight: 1.45 }}>{routeNotice}</div>}
            {routeResult?.validation && routeResult.validation.rejectedCount > 0 && (
              <div style={{ marginTop: 10, color: "#b45309", fontSize: 11.5, lineHeight: 1.45 }}>
                입력 검증에서 {routeResult.validation.rejectedCount}척이 경로 추천 계산에서 제외되었습니다.
              </div>
            )}

            <div style={{ height: 1, background: LT.borderColor, margin: "14px 0 12px" }} />

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: LT.ink }}>친환경 경로 추천 결과</h2>
              {routeResult && <span style={{ color: muted, fontSize: 10.5 }}>{formatDateTime(routeResult.lastUpdated)}</span>}
            </div>
            <RouteScenarioResults result={routeResult} />
          </section>
        </aside>
      </div>

      <SimulatedShipModal
        open={pendingPosition !== null}
        position={pendingPosition}
        defaultName={defaultName}
        onCancel={() => setPendingPosition(null)}
        onCreate={createShip}
      />
      <LiveShipImportModal
        open={liveImportOpen}
        onCancel={() => setLiveImportOpen(false)}
        onImport={createShip}
      />
    </div>
  );
}
