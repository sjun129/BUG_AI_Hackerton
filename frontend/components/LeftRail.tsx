"use client";

// 좌측 아이콘 레일 — 대시보드(지도)와 선박/시뮬레이션/혼잡도 화면이 공유한다.
// 시안(관제 지도)과 동일하게: 로고 → 관제 지도 → 선박 → 시뮬레이션 → 혼잡도, 맨 아래 밝기 아이콘.
import Link from "next/link";
import type { ReactNode } from "react";
import { LT } from "./theme";

const panel = LT.panel;
const border = LT.border;

type IconName = "map" | "ship" | "chart" | "sun";

// 단색 라인 아이콘(활성 시 흰색, 비활성 시 회색). 이모지 대신 SVG로 시안의 깔끔한 톤을 맞춘다.
function Icon({ name, color }: { name: IconName; color: string }): ReactNode {
  const common = { width: 21, height: 21, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (name) {
    case "map":
      return (
        <svg {...common}>
          <path d="M9 3 3 5.5v15L9 18l6 3 6-2.5v-15L15 6 9 3Z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );
    case "ship":
      return (
        <svg {...common}>
          <path d="M3 15l1.5 5.5a1 1 0 0 0 1 .7h11a1 1 0 0 0 1-.7L20 15" />
          <path d="M5 15V9l7-3 7 3v6" />
          <path d="M12 3v3M9 21V12h6v9" />
        </svg>
      );
    case "chart":
      return (
        <svg {...common}>
          <path d="M6 20V10M12 20V4M18 20v-6" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
  }
}

type RailItem = { key: string; icon?: IconName; letter?: string; label: string; href?: string };

export const RAIL_ITEMS: RailItem[] = [
  { key: "map", icon: "map", label: "관제 지도", href: "/dashboard" },
  { key: "ship", icon: "ship", label: "선박 모니터링", href: "/vessel" },
  { key: "sim", letter: "S", label: "시뮬레이션", href: "/simulation" },
  { key: "congestion", icon: "chart", label: "혼잡도 통계", href: "/congestion" },
];

function RailIcon({ item, on }: { item: RailItem; on: boolean }) {
  const color = on ? "#fff" : LT.muted;
  return (
    <div
      title={item.label}
      style={{
        width: 44,
        height: 44,
        borderRadius: 13,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 17,
        fontWeight: 800,
        color,
        background: on ? "linear-gradient(135deg,#2f6bff,#5b8cff)" : "transparent",
        boxShadow: on ? "0 6px 16px rgba(47,107,255,.35)" : "none",
        cursor: item.href ? "pointer" : "default",
      }}
    >
      {item.letter ? item.letter : item.icon ? <Icon name={item.icon} color={color} /> : null}
    </div>
  );
}

// active: 현재 화면에 해당하는 항목의 href (예: "/vessel")
export default function LeftRail({ active }: { active: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        bottom: 16,
        width: 60,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "12px 0",
        background: panel,
        backdropFilter: "blur(14px)",
        border,
        borderRadius: 18,
        boxShadow: LT.shadow,
      }}
    >
      {/* 로고 */}
      <Link
        href="/"
        title="홈"
        style={{
          width: 42,
          height: 42,
          borderRadius: 13,
          background: "linear-gradient(135deg,#2f6bff,#5b8cff)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 6,
          textDecoration: "none",
          color: "#fff",
          fontWeight: 900,
          fontSize: 20,
          letterSpacing: "-.02em",
          boxShadow: "0 6px 16px rgba(47,107,255,.35)",
        }}
      >
        C
      </Link>

      {RAIL_ITEMS.map((item) => {
        const on = item.href === active;
        return item.href ? (
          <Link key={item.key} href={item.href} style={{ textDecoration: "none" }}>
            <RailIcon item={item} on={on} />
          </Link>
        ) : (
          <RailIcon key={item.key} item={item} on={on} />
        );
      })}

      {/* 하단 밝기 아이콘 (시안 반영, 장식) */}
      <div style={{ marginTop: "auto" }}>
        <RailIcon item={{ key: "sun", icon: "sun", label: "밝기" }} on={false} />
      </div>
    </div>
  );
}
