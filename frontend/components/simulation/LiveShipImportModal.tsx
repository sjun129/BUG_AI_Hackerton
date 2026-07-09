"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_SIMULATION_DESTINATION_ID, SIMULATION_DESTINATION_PORTS } from "@/frontend/config/ports";
import type { Ship } from "@/frontend/types/domain";
import type { NewSimulatedShipInput, SimulatedVesselType, SimulationDestinationPortId } from "@/frontend/types/simulation";
import { SIMULATED_VESSEL_TYPE_LABELS } from "@/frontend/types/simulation";
import { LT } from "@/frontend/components/theme";

interface LiveShipImportModalProps {
  open: boolean;
  onCancel: () => void;
  onImport: (ship: NewSimulatedShipInput) => void;
}

const panel = LT.panelSolid;
const muted = LT.muted;
const border = LT.border;
const fieldStyle = { height: 36, borderRadius: 10, border: LT.border, background: "#fff", color: LT.ink, padding: "0 10px", outline: "none", fontSize: 13 } as const;

function normalizeVesselType(value?: string): SimulatedVesselType | undefined {
  const text = (value ?? "").toLowerCase();
  if (/container|컨테이너/.test(text)) return "container";
  if (/bulk|벌크|산물/.test(text)) return "bulk";
  if (/tanker|탱커|석유|유조/.test(text)) return "tanker";
  if (/lng/.test(text)) return "lng";
  if (/cargo|general|일반/.test(text)) return "generalCargo";
  return undefined;
}

function hasPosition(ship: Ship): boolean {
  return Number.isFinite(ship.lat) && Number.isFinite(ship.lon);
}

function canImport(ship: Ship): boolean {
  return hasPosition(ship) && Number.isFinite(ship.sog) && ship.sog >= 3 && ship.sog <= 30;
}

function fmt(value: unknown, fallback = "-"): string {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value);
}

function snapshotInput(ship: Ship, destinationPortId: SimulationDestinationPortId): NewSimulatedShipInput {
  const now = new Date().toISOString();
  return {
    id: `snapshot-${ship.mmsi || ship.name}-${Date.now()}`,
    name: ship.name || `AIS ${ship.mmsi}`,
    lat: ship.lat,
    lng: ship.lon,
    sog: ship.sog,
    vesselType: normalizeVesselType(ship.vesselType),
    ...(ship.grossTonnage != null ? { grossTonnage: ship.grossTonnage } : {}),
    destinationPortId,
    source: "ais-snapshot",
    originalShipId: ship.mmsi,
    mmsi: ship.mmsi,
    ...(ship.imo ? { imo: ship.imo } : {}),
    ...(ship.callSign ? { callSign: ship.callSign } : {}),
    snapshotAt: ship.lastUpdated ?? ship.eta ?? now,
    createdAt: now,
  };
}

export default function LiveShipImportModal({ open, onCancel, onImport }: LiveShipImportModalProps) {
  const [ships, setShips] = useState<Ship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [underwayOnly, setUnderwayOnly] = useState(true);
  const [minSpeedOnly, setMinSpeedOnly] = useState(true);
  const [destinationPortId, setDestinationPortId] = useState<SimulationDestinationPortId>(DEFAULT_SIMULATION_DESTINATION_ID);

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch("/api/ships", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (active) setShips(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setError("실시간 선박 데이터를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [open]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ships
      .filter((ship) => hasPosition(ship))
      .filter((ship) => !underwayOnly || ship.status === "underway")
      .filter((ship) => !minSpeedOnly || ship.sog >= 3)
      .filter((ship) => !q || ship.name.toLowerCase().includes(q) || ship.mmsi.includes(q))
      .sort((a, b) => Number(canImport(b)) - Number(canImport(a)) || b.sog - a.sog)
      .slice(0, 80);
  }, [minSpeedOnly, query, ships, underwayOnly]);

  if (!open) return null;

  return (
    <div role="dialog" aria-modal="true" aria-label="실시간 선박 불러오기" style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(15,23,42,.42)", backdropFilter: "blur(6px)" }}>
      <section style={{ width: "min(920px, 100%)", maxHeight: "86vh", display: "flex", flexDirection: "column", borderRadius: 16, border, background: panel, color: LT.ink, boxShadow: "0 24px 70px rgba(15,23,42,.28)", overflow: "hidden" }}>
        <header style={{ padding: 16, borderBottom: `1px solid ${LT.borderColor}`, display: "flex", gap: 12, justifyContent: "space-between" }}>
          <div>
            <div style={{ color: LT.blue, fontSize: 11, fontWeight: 800, letterSpacing: ".08em" }}>LIVE SNAPSHOT</div>
            <h2 style={{ margin: "5px 0 0", fontSize: 20, fontWeight: 800, color: LT.ink }}>실시간 선박 불러오기</h2>
            <p style={{ margin: "7px 0 0", color: muted, fontSize: 12.5 }}>원본 실제 선박은 수정하지 않고 시뮬레이션용 스냅샷으로만 복사합니다.</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="닫기" style={{ width: 32, height: 32, borderRadius: 8, border: LT.border, background: LT.tile, color: LT.inkSoft, cursor: "pointer", fontSize: 18 }}>×</button>
        </header>

        <div style={{ padding: 14, display: "grid", gridTemplateColumns: "minmax(180px,1fr) 180px auto auto", gap: 10, alignItems: "center", borderBottom: `1px solid ${LT.borderColor}` }}>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="선박명 또는 MMSI 검색" style={fieldStyle} />
          <select value={destinationPortId} onChange={(event) => setDestinationPortId(event.target.value as SimulationDestinationPortId)} style={fieldStyle}>
            {SIMULATION_DESTINATION_PORTS.map((destination) => (
              <option key={destination.id} value={destination.id}>{destination.name}</option>
            ))}
          </select>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: muted, fontSize: 12, fontWeight: 800 }}>
            <input type="checkbox" checked={underwayOnly} onChange={(event) => setUnderwayOnly(event.target.checked)} /> 항해 중
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, color: muted, fontSize: 12, fontWeight: 800 }}>
            <input type="checkbox" checked={minSpeedOnly} onChange={(event) => setMinSpeedOnly(event.target.checked)} /> 3kn 이상
          </label>
        </div>

        <div style={{ padding: 14, overflowY: "auto" }}>
          {loading ? <p style={{ color: muted }}>불러오는 중...</p> : null}
          {error ? <p style={{ color: LT.red, fontWeight: 800 }}>{error}</p> : null}
          {!loading && !error && shown.length === 0 ? <p style={{ color: muted }}>현 시뮬레이션에 추가할 수 있는 실제 선박이 없습니다.</p> : null}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shown.map((ship) => {
              const valid = canImport(ship);
              const vesselType = normalizeVesselType(ship.vesselType);
              return (
                <article key={ship.mmsi || ship.name} style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) .8fr .7fr .8fr auto", gap: 10, alignItems: "center", padding: 11, borderRadius: 12, border: LT.border, background: "#fff" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: LT.blue, background: "rgba(37,99,235,.12)", padding: "3px 7px", borderRadius: 6 }}>LIVE SNAPSHOT</span>
                      <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: LT.ink }}>{ship.name}</strong>
                    </div>
                    <div style={{ marginTop: 5, color: muted, fontSize: 11 }}>MMSI {fmt(ship.mmsi)} · IMO {fmt(ship.imo)} · GT {ship.grossTonnage?.toLocaleString("ko-KR") ?? "-"}</div>
                  </div>
                  <div style={{ color: LT.inkSoft, fontSize: 12 }}>상태 {ship.status}<br />SOG {ship.sog}kn</div>
                  <div style={{ color: LT.inkSoft, fontSize: 12 }}>위도 {ship.lat.toFixed(4)}<br />경도 {ship.lon.toFixed(4)}</div>
                  <div style={{ color: LT.inkSoft, fontSize: 12 }}>선종 {vesselType ? SIMULATED_VESSEL_TYPE_LABELS[vesselType] : "-"}</div>
                  <button type="button" disabled={!valid} onClick={() => onImport(snapshotInput(ship, destinationPortId))} style={{ height: 34, padding: "0 13px", borderRadius: 10, border: valid ? "none" : LT.border, background: valid ? LT.blue : LT.tile, color: valid ? "#fff" : "#a3aec1", fontWeight: 800, cursor: valid ? "pointer" : "not-allowed" }}>
                    {valid ? "추가" : "추가 불가"}
                  </button>
                  {!valid && <div style={{ gridColumn: "1 / -1", color: "#b45309", fontSize: 11 }}>위치 또는 속도 정보가 없어 시뮬레이션에 추가할 수 없습니다.</div>}
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
