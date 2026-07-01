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
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="congGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2f6bff" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#2f6bff" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(10,24,48,0.08)" />
          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#8a97b3" }} stroke="#d3ddf2" />
          <YAxis domain={[0, 1]} tick={{ fontSize: 11, fill: "#8a97b3" }} stroke="#d3ddf2" />
          <Tooltip
            formatter={(value: number) => [`${Math.round(value * 100)}%`, "혼잡도"]}
            contentStyle={{
              borderRadius: 12,
              border: "1px solid rgba(10,24,48,.08)",
              boxShadow: "0 8px 24px rgba(20,40,90,.12)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="level"
            stroke="#2f6bff"
            strokeWidth={2.5}
            fill="url(#congGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
