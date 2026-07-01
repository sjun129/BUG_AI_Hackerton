"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Ship } from "@/backend/ports/port-types";
import { BUSAN_PORT } from "@/backend/ports/seed-port";

// Marker 아이콘 대신 CircleMarker를 쓰면 Next.js에서 leaflet 기본 아이콘 경로가
// 깨지는 문제(번들러가 이미지 asset을 못 찾는 이슈)를 아예 피할 수 있다.
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

interface ShipMapProps {
  ships: Ship[];
  selectedMmsi: string | null;
  onSelect: (mmsi: string) => void;
}

export default function ShipMap({ ships, selectedMmsi, onSelect }: ShipMapProps) {
  return (
    <MapContainer
      center={[BUSAN_PORT.center.lat, BUSAN_PORT.center.lon]}
      zoom={11}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {ships.map((ship) => (
        <CircleMarker
          key={ship.mmsi}
          center={[ship.lat, ship.lon]}
          radius={ship.mmsi === selectedMmsi ? 9 : 6}
          pathOptions={{
            color: STATUS_COLOR[ship.status],
            fillColor: STATUS_COLOR[ship.status],
            fillOpacity: 0.8,
          }}
          eventHandlers={{ click: () => onSelect(ship.mmsi) }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-medium">{ship.name}</p>
              <p>MMSI: {ship.mmsi}</p>
              <p>상태: {STATUS_LABEL[ship.status]}</p>
              <p>속력: {ship.sog}kn</p>
              <p>ETA: {new Date(ship.eta).toLocaleString("ko-KR")}</p>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
