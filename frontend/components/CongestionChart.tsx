"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CongestionForecast } from "@/backend/ports/port-types";

interface CongestionChartProps {
  forecast: CongestionForecast;
}

export default function CongestionChart({ forecast }: CongestionChartProps) {
  const data = forecast.forecast.map((point) => ({
    time: new Date(point.time).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
    level: point.level,
  }));

  return (
    <div>
      <p className="mb-2 text-sm text-[var(--color-ink-soft)]">
        현재 혼잡도:{" "}
        <span className="font-medium text-[var(--color-ink)]">
          {Math.round(forecast.currentLevel * 100)}%
        </span>
      </p>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <YAxis domain={[0, 1]} tick={{ fontSize: 11 }} stroke="#94a3b8" />
            <Tooltip formatter={(value: number) => `${Math.round(value * 100)}%`} />
            <Area type="monotone" dataKey="level" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
