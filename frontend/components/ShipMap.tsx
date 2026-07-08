"use client";

import L from "leaflet";
import { useMemo } from "react";
import { MapContainer, Marker, Popup, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { BUSAN_DISPLAY_PORT, type DisplayBerthArea } from "@/frontend/config/ports";
import type { PortCall, Ship } from "@/frontend/types/domain";
import { BASEMAPS } from "./basemaps";

const STATUS_COLOR: Record<Ship["status"], string> = {
  underway: "#38bdf8",
  anchored: "#facc15",
  moored: "#4ade80",
};

const STATUS_LABEL: Record<Ship["status"], string> = {
  underway: "항해 중",
  anchored: "묘박 중",
  moored: "접안 중",
};

// cog(침로)에 따라 회전하는 삼각형(화살촉) 아이콘을 divIcon으로 만든다.
// 기본 Marker 이미지 대신 인라인 SVG를 쓰면 Next.js 번들러의 아이콘 경로 문제를 피할 수 있다.
function shipIcon(ship: Ship, selected: boolean): L.DivIcon {
  const color = STATUS_COLOR[ship.status];
  const size = selected ? 30 : 22;
  const html = `
    <div style="transform: rotate(${ship.cog}deg); width:${size}px; height:${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <polygon points="12,2 20,22 12,17 4,22"
          fill="${color}" stroke="#0b1220" stroke-width="1.5" stroke-linejoin="round" />
      </svg>
    </div>`;
  return L.divIcon({
    html,
    className: "ship-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// 부두별 정박선 수를 나타내는 라벨 버블(divIcon). 숫자가 클수록 크고 진하게.
function berthAreaIcon(area: DisplayBerthArea, berthed: number, anchored: number): L.DivIcon {
  const total = berthed + anchored;
  const size = Math.min(56, 26 + total * 1.6);
  const color = anchored > berthed ? "#e8952b" : "#2f6bff"; // 묘박 우세면 주황, 접안 우세면 파랑
  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translateY(-2px)">
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};color:#fff;
        display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.max(12, size / 3)}px;
        border:2px solid #fff;box-shadow:0 4px 12px rgba(20,40,90,.35)">${total}</div>
      <div style="margin-top:2px;font-size:10.5px;font-weight:700;color:#0a1830;background:rgba(255,255,255,.85);
        padding:1px 6px;border-radius:6px;white-space:nowrap">${area.name}</div>
    </div>`;
  return L.divIcon({ html, className: "berth-area-marker", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

interface ShipMapProps {
  ships: Ship[];
  selectedMmsi: string | null;
  onSelect: (mmsi: string) => void;
  portCalls?: PortCall[]; // Port-MIS 정박선 — 부두별로 집계해 지도에 표시
  basemapId: string; // 배경 지도 선택값(대시보드 우측 레일에서 제어)
}

export default function ShipMap({ ships, selectedMmsi, onSelect, portCalls = [], basemapId }: ShipMapProps) {
  const basemap = BASEMAPS.find((b) => b.id === basemapId) ?? BASEMAPS[0];

  // 부두별 접안/묘박 척수 집계
  const areaStats = useMemo(() => {
    const stats = new Map<string, { berthed: number; anchored: number }>();

    for (const call of portCalls) {
      if (!call.berthAreaId) continue;
      const current = stats.get(call.berthAreaId) ?? { berthed: 0, anchored: 0 };
      if (call.berthType === "접안") current.berthed += 1;
      else if (call.berthType === "묘박") current.anchored += 1;
      stats.set(call.berthAreaId, current);
    }

    return BUSAN_DISPLAY_PORT.berthAreas
      .map((area) => {
        const current = stats.get(area.id) ?? { berthed: 0, anchored: 0 };
        return { area, ...current, total: current.berthed + current.anchored };
      })
      .filter((s) => s.total > 0);
  }, [portCalls]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[BUSAN_DISPLAY_PORT.center.lat, BUSAN_DISPLAY_PORT.center.lng]}
        zoom={11}
        zoomControl={false}
        className="h-full w-full"
      >
        {/* key로 배경 전환 시 타일 레이어를 확실히 교체한다 */}
        {basemap.url && <TileLayer key={basemap.id} attribution={basemap.attribution} url={basemap.url} />}
        {/* 위성 배경일 때 지명·도로 라벨 오버레이 */}
        {basemap.hybrid && <TileLayer key={`${basemap.id}-hybrid`} url={basemap.hybrid} />}

      {/* 부두별 정박선 집계 마커 (Port-MIS 기반) */}
      {areaStats.map(({ area, berthed, anchored, total }) => (
        <Marker key={area.id} position={[area.lat, area.lng]} icon={berthAreaIcon(area, berthed, anchored)}>
          <Popup>
            <div className="text-sm">
              <p className="font-medium">{area.name}</p>
              <p>정박 {total}척</p>
              <p>접안 {berthed} · 묘박 {anchored}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {ships.map((ship) => (
        <Marker
          key={ship.mmsi}
          position={[ship.lat, ship.lon]}
          icon={shipIcon(ship, ship.mmsi === selectedMmsi)}
          eventHandlers={{ click: () => onSelect(ship.mmsi) }}
        >
          {/* hover: 선박명·속도 */}
          <Tooltip direction="top" offset={[0, -12]}>
            <span className="font-medium">{ship.name}</span> · {ship.sog}kn
          </Tooltip>

          {/* click: 상세(ETA 포함) */}
          <Popup>
            <div className="text-sm">
              <p className="font-medium">{ship.name}</p>
              <p>MMSI: {ship.mmsi}</p>
              <p>상태: {STATUS_LABEL[ship.status]}</p>
              <p>속력: {ship.sog}kn</p>
              <p>침로: {ship.cog}°</p>
              <p>ETA: {new Date(ship.eta).toLocaleString("ko-KR")}</p>
              {/* Port-MIS 입출항 신고 매칭 결과(있을 때만) — backend/portmis/run-enrich.ts */}
              {(ship.previousPort || ship.nextPort || ship.berthName) && (
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #e5e7eb" }}>
                  {ship.previousPort && <p>직전 출항항: {ship.previousPort}</p>}
                  {ship.nextPort && <p>다음 기항지: {ship.nextPort}</p>}
                  {ship.berthName && <p>선석: {ship.berthName}</p>}
                  {ship.grossTonnage != null && <p>총톤수: {ship.grossTonnage.toLocaleString()}톤</p>}
                </div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      </MapContainer>
    </div>
  );
}
