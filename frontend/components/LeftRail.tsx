"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { LT } from "./theme";

// 왼쪽 메뉴 — 아이콘 아래에 메뉴 이름을 붙여 기능을 바로 알아볼 수 있게 한다.
// 지도가 있는 화면은 bottom 슬롯에 '지도 타입' 같은 버튼을 넣는다.
export const RAIL_WIDTH = 88;
export const RAIL_GAP = 16;
/** 메뉴 오른쪽 끝 + 여백 — 각 페이지 본문이 시작하는 x 좌표 */
export const RAIL_OFFSET = RAIL_GAP + RAIL_WIDTH + RAIL_GAP;

const HOME_LABEL = "홈";

// 메뉴 아이콘: 지도·선박·AI·차트는 디자인 시안의 아이콘 이미지, 시뮬레이션은 선 아이콘.
export function ImgIcon({ src, size = 24 }: { src: string; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" width={size} height={size} style={{ objectFit: "contain" }} />;
}
const RouteIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="6" cy="19" r="2.6" />
    <path d="M8.6 19h8.9a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7h8.9" />
    <circle cx="18" cy="5" r="2.6" />
  </svg>
);

type RailItem = { key: string; label: string; href: string; icon: ReactNode };

export const RAIL_ITEMS: RailItem[] = [
  { key: "map", label: "관제 지도", href: "/dashboard", icon: <ImgIcon src="/icons/map.png" /> },
  { key: "ship", label: "선박 모니터링", href: "/vessel", icon: <ImgIcon src="/icons/ship.png" /> },
  { key: "sim", label: "시뮬레이션", href: "/simulation", icon: RouteIcon },
  { key: "control-room", label: "AI 관제사", href: "/control-room", icon: <ImgIcon src="/icons/bot.png" /> },
  { key: "congestion", label: "혼잡도 통계", href: "/congestion", icon: <ImgIcon src="/icons/chart.png" /> },
];

/** 메뉴 한 칸(아이콘 + 이름). 지도 타입 버튼처럼 링크가 아닌 항목에도 쓴다. */
export function RailItemView({ icon, label, on, onClick }: { icon: ReactNode; label: string; on: boolean; onClick?: () => void }) {
  return (
    <div
      title={label}
      onClick={onClick}
      style={{
        width: 72,
        padding: "10px 4px 8px",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        background: on ? LT.blueSoft : "transparent",
        cursor: "pointer",
      }}
    >
      <span style={{ display: "flex", opacity: on ? 1 : 0.5 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: on ? 800 : 600, color: on ? LT.blue : LT.muted, textAlign: "center", lineHeight: 1.25 }}>{label}</span>
    </div>
  );
}

export default function LeftRail({ active, bottom }: { active: string; bottom?: ReactNode }) {
  return (
    <nav
      style={{
        position: "absolute",
        top: RAIL_GAP,
        left: RAIL_GAP,
        bottom: RAIL_GAP,
        width: RAIL_WIDTH,
        zIndex: 700,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        padding: "20px 0",
        background: "#fff",
        borderRadius: 20,
        boxShadow: "0 8px 24px rgba(15,23,42,.07), 0 1px 3px rgba(15,23,42,.04)",
        fontFamily: "Pretendard, system-ui, sans-serif",
      }}
    >
      <Link href="/" title={HOME_LABEL} style={{ textDecoration: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingBottom: 10 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: "linear-gradient(135deg,#618cff,#2563eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: 900,
            fontSize: 18,
          }}
        >
          P
        </span>
        <span style={{ fontSize: 10, fontWeight: 900, color: LT.ink }}>PORTIQ</span>
      </Link>
      <div style={{ width: 40, height: 1, background: LT.borderColor }} />

      {RAIL_ITEMS.map((item) => (
        <Link key={item.key} href={item.href} style={{ textDecoration: "none" }}>
          <RailItemView icon={item.icon} label={item.label} on={item.href === active} />
        </Link>
      ))}

      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {bottom}
        <span style={{ fontSize: 10, fontWeight: 600, color: LT.muted }}>부산항</span>
      </div>
    </nav>
  );
}
