"use client";

import Link from "next/link";

const muted = "#8aa0c8";
const panel = "rgba(11,18,34,0.82)";
const border = "1px solid rgba(120,160,255,0.14)";

export const RAIL_ITEMS: { icon: string; label: string; href?: string }[] = [
  { icon: "M", label: "관제 지도", href: "/dashboard" },
  { icon: "V", label: "선박 모니터링", href: "/vessel" },
  { icon: "S", label: "시뮬레이션", href: "/simulation" },
  { icon: "AI", label: "AI 관제사", href: "/control-room" },
  { icon: "B", label: "선석 대기" },
  { icon: "C", label: "혼잡도 통계", href: "/congestion" },
  { icon: "G", label: "설정" },
];

export default function LeftRail({ active }: { active: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        bottom: 16,
        width: 52,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "12px 0",
        background: panel,
        backdropFilter: "blur(14px)",
        border,
        borderRadius: 14,
      }}
    >
      <Link
        href="/"
        title="홈"
        style={{
          width: 34,
          height: 34,
          borderRadius: 9,
          background: "linear-gradient(135deg,#2f6bff,#5b8cff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 8,
          textDecoration: "none",
        }}
      >
        <div style={{ width: 12, height: 12, border: "2.5px solid #fff", borderRadius: "50%", borderRightColor: "transparent" }} />
      </Link>
      {RAIL_ITEMS.map((item, index) => {
        const on = item.href === active;
        const inner = (
          <div
            key={index}
            title={item.label}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: item.icon.length > 1 ? 12 : 15,
              fontWeight: 900,
              letterSpacing: item.icon.length > 1 ? "-.02em" : 0,
              color: on ? "#fff" : muted,
              background: on ? "linear-gradient(135deg,#2f6bff,#5b8cff)" : "transparent",
              cursor: item.href ? "pointer" : "default",
            }}
          >
            {item.icon}
          </div>
        );
        return item.href ? (
          <Link key={index} href={item.href} style={{ textDecoration: "none" }}>
            {inner}
          </Link>
        ) : (
          inner
        );
      })}
    </div>
  );
}
