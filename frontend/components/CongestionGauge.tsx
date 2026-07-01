"use client";

import { BUSAN_PORT } from "@/backend/ports/seed-port";

interface CongestionGaugeProps {
  level: number; // 0~1
}

const ARC_LEN = Math.PI * 63; // 반원 게이지 호 길이 ≈ 197.9

// 혼잡도(0~1)를 seed-port 임계값에 맞춰 색상·상태로 매핑한다.
function congestionInfo(level: number) {
  const { low, medium } = BUSAN_PORT.congestionThresholds;
  if (level <= low) return { color: "#16a34a", status: "원활" };
  if (level <= medium) return { color: "#e8952b", status: "보통" };
  return { color: "#e0483d", status: "혼잡" };
}

export default function CongestionGauge({ level }: CongestionGaugeProps) {
  const pct = Math.max(0, Math.min(100, Math.round(level * 100)));
  const info = congestionInfo(level);
  const gaugeOff = ARC_LEN * (1 - pct / 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
        <svg width="200" height="118" viewBox="0 0 150 88">
          <path
            d="M12 80 A63 63 0 0 1 138 80"
            fill="none"
            stroke="#e4ebfa"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <path
            d="M12 80 A63 63 0 0 1 138 80"
            fill="none"
            stroke={info.color}
            strokeWidth="13"
            strokeLinecap="round"
            strokeDasharray={ARC_LEN}
            strokeDashoffset={gaugeOff}
            style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.2,.8,.2,1), stroke .4s" }}
          />
        </svg>
        <div style={{ position: "absolute", bottom: 4, textAlign: "center", width: "100%" }}>
          <div style={{ fontSize: 42, fontWeight: 800, letterSpacing: "-.02em", color: info.color }}>
            {pct}
            <span style={{ fontSize: 22 }}>%</span>
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          padding: "6px 14px",
          borderRadius: 999,
          background: `${info.color}18`,
          color: info.color,
          fontSize: 13.5,
          fontWeight: 800,
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: info.color }} />
        {info.status}
      </div>

      <div style={{ marginTop: 10, fontSize: 12.5, color: "#8a97b3", fontWeight: 600, textAlign: "center" }}>
        임계값 · 원활 ≤ {Math.round(BUSAN_PORT.congestionThresholds.low * 100)}% · 보통 ≤{" "}
        {Math.round(BUSAN_PORT.congestionThresholds.medium * 100)}%
      </div>
    </div>
  );
}
