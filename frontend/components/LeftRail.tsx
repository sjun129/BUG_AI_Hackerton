"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LT } from "./theme";

const panel = LT.panel;
const border = LT.border;
const HOME_LABEL = "\uD648";
const BRIGHTNESS_LABEL = "\uBC1D\uAE30";

type IconName = "map" | "ship" | "chart" | "sun";
type RailItem = { key: string; icon?: IconName; letter?: string; label: string; href?: string };

function Icon({ name, color }: { name: IconName; color: string }): ReactNode {
  const common = {
    width: 21,
    height: 21,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

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

export const RAIL_ITEMS: RailItem[] = [
  { key: "map", icon: "map", label: "\uAD00\uC81C \uC9C0\uB3C4", href: "/dashboard" },
  { key: "ship", icon: "ship", label: "\uC120\uBC15 \uBAA8\uB2C8\uD130\uB9C1", href: "/vessel" },
  { key: "sim", letter: "S", label: "\uC2DC\uBBAC\uB808\uC774\uC158", href: "/simulation" },
  { key: "control-room", letter: "AI", label: "AI \uAD00\uC81C\uC0AC", href: "/control-room" },
  { key: "congestion", icon: "chart", label: "\uD63C\uC7A1\uB3C4 \uD1B5\uACC4", href: "/congestion" },
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
        fontSize: item.letter && item.letter.length > 1 ? 12 : 17,
        fontWeight: 800,
        letterSpacing: item.letter && item.letter.length > 1 ? "-.02em" : 0,
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
      <Link
        href="/"
        title={HOME_LABEL}
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

      <div style={{ marginTop: "auto" }}>
        <RailIcon item={{ key: "sun", icon: "sun", label: BRIGHTNESS_LABEL }} on={false} />
      </div>
    </div>
  );
}
