"use client";

import type { Ship } from "@/backend/ports/port-types";

const STATUS_LABEL: Record<Ship["status"], string> = {
  underway: "항해 중",
  anchored: "묘박 중",
  moored: "접안 중",
};

interface ShipListProps {
  ships: Ship[];
  selectedMmsi: string | null;
  onSelect: (mmsi: string) => void;
}

export default function ShipList({ ships, selectedMmsi, onSelect }: ShipListProps) {
  const sorted = [...ships].sort((a, b) => a.eta.localeCompare(b.eta));

  return (
    <div className="max-h-72 overflow-y-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-[var(--color-surface)] text-[var(--color-ink-soft)]">
          <tr>
            <th className="pb-2 pr-2 font-normal">선박명</th>
            <th className="pb-2 pr-2 font-normal">상태</th>
            <th className="pb-2 pr-2 font-normal">속력</th>
            <th className="pb-2 font-normal">ETA</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((ship) => (
            <tr
              key={ship.mmsi}
              onClick={() => onSelect(ship.mmsi)}
              className={`cursor-pointer border-t border-white/5 hover:bg-white/5 ${
                ship.mmsi === selectedMmsi ? "bg-white/10" : ""
              }`}
            >
              <td className="py-2 pr-2">{ship.name}</td>
              <td className="py-2 pr-2">{STATUS_LABEL[ship.status]}</td>
              <td className="py-2 pr-2">{ship.sog}kn</td>
              <td className="py-2">{new Date(ship.eta).toLocaleString("ko-KR")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
