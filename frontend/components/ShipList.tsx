"use client";

import type { Ship } from "@/backend/ports/port-types";

const STATUS_LABEL: Record<Ship["status"], string> = {
  underway: "항해 중",
  anchored: "묘박 중",
  moored: "접안 중",
};

// 상태별 배지 색상 (PORTIQ 팔레트)
const STATUS_BADGE: Record<Ship["status"], { bg: string; color: string }> = {
  underway: { bg: "#e8f0ff", color: "#2f6bff" },
  anchored: { bg: "#fff3e6", color: "#e8952b" },
  moored: { bg: "#eafaf0", color: "#16a34a" },
};

interface ShipListProps {
  ships: Ship[];
  selectedMmsi: string | null;
  onSelect: (mmsi: string) => void;
}

export default function ShipList({ ships, selectedMmsi, onSelect }: ShipListProps) {
  const sorted = [...ships].sort((a, b) => a.eta.localeCompare(b.eta));

  return (
    <div className="max-h-80 overflow-y-auto">
      <table className="w-full text-left text-sm" style={{ borderCollapse: "collapse" }}>
        <thead
          className="sticky top-0"
          style={{ background: "#fff", color: "#8a97b3", fontSize: 12.5 }}
        >
          <tr>
            <th className="pb-2 pr-2 font-semibold">선박명</th>
            <th className="pb-2 pr-2 font-semibold">상태</th>
            <th className="pb-2 pr-2 font-semibold">속력</th>
            <th className="pb-2 pr-2 font-semibold">ETA</th>
            <th className="pb-2 font-semibold">경로 (Port-MIS)</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ship) => {
            const selected = ship.mmsi === selectedMmsi;
            const badge = STATUS_BADGE[ship.status];
            return (
              <tr
                key={ship.mmsi}
                onClick={() => onSelect(ship.mmsi)}
                style={{
                  cursor: "pointer",
                  borderTop: "1px solid rgba(10,24,48,.06)",
                  background: selected ? "#eaf0ff" : "transparent",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = "#f6f9ff";
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = "transparent";
                }}
              >
                <td className="py-2.5 pr-2" style={{ fontWeight: 700, color: "#0a1830" }}>
                  {ship.name}
                </td>
                <td className="py-2.5 pr-2">
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: 999,
                      background: badge.bg,
                      color: badge.color,
                    }}
                  >
                    {STATUS_LABEL[ship.status]}
                  </span>
                </td>
                <td className="py-2.5 pr-2" style={{ color: "#5a6785" }}>
                  {ship.sog}kn
                </td>
                <td className="py-2.5 pr-2" style={{ color: "#5a6785" }}>
                  {new Date(ship.eta).toLocaleString("ko-KR")}
                </td>
                <td className="py-2.5" style={{ color: "#5a6785", fontSize: 12.5 }}>
                  {ship.previousPort || ship.nextPort
                    ? `${ship.previousPort ?? "?"} → ${ship.nextPort ?? "?"}`
                    : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
