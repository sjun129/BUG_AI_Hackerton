"use client";

import { CartesianGrid, Line, LineChart, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CiiCurvePoint } from "@/frontend/config/vessel-display";

interface CiiSpeedChartProps {
  data: CiiCurvePoint[];
  selectedPoint: CiiCurvePoint;
}

const muted = "#8aa0c8";
const border = "1px solid rgba(120,160,255,0.14)";

export default function CiiSpeedChart({ data, selectedPoint }: CiiSpeedChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: -12 }}>
        <CartesianGrid stroke="rgba(255,255,255,.06)" />
        <XAxis dataKey="speed" tick={{ fill: muted, fontSize: 10 }} stroke="rgba(255,255,255,.15)" />
        <YAxis tick={{ fill: muted, fontSize: 10 }} stroke="rgba(255,255,255,.15)" domain={[1, 3]} />
        <Tooltip
          contentStyle={{ background: "rgba(11,18,34,.95)", border, borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: muted }}
          formatter={(val: number) => [val.toFixed(3), "CII"]}
          labelFormatter={(label) => `${label} kn`}
        />
        <Line type="monotone" dataKey="cii" stroke="#facc15" strokeWidth={2.5} dot={false} />
        <ReferenceDot x={selectedPoint.speed} y={selectedPoint.cii} r={6} fill="#facc15" stroke="#070c17" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}
