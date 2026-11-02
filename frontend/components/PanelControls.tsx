"use client";

import type { ReactNode } from "react";
import { LT } from "./theme";

// 대시보드 오버레이 패널 공용 조작부 — 닫기(X) 버튼과, 닫힌 패널을 다시 여는 원형 버블.

export function CloseButton({ onClick, label = "닫기" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 28,
        height: 28,
        flex: "none",
        borderRadius: 14,
        border: "none",
        background: LT.tile,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <path d="M2 2l8 8M10 2l-8 8" stroke={LT.muted} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** 닫힌 패널 자리에 남는 원형 버블 — 아이콘 + 기능 이름 + 모서리 숫자 배지. 누르면 패널이 다시 열린다. */
export function PanelBubble({
  icon,
  label,
  badge,
  tone,
  softTone,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  tone: string;
  softTone: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} 열기`}
      style={{
        position: "relative",
        width: 88,
        height: 88,
        flex: "none",
        borderRadius: "50%",
        border: `4px solid ${softTone}`,
        background: "#fff",
        boxShadow: "0 8px 24px rgba(15,23,42,.10), 0 1px 3px rgba(15,23,42,.05)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {icon}
      <span style={{ fontSize: 12, fontWeight: 800, color: LT.inkSoft }}>{label}</span>
      {badge && (
        <span
          style={{
            position: "absolute",
            top: -6,
            right: -8,
            padding: "2px 8px",
            borderRadius: 999,
            background: tone,
            border: "2px solid #fff",
            color: "#fff",
            fontSize: 12,
            fontWeight: 900,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** 감속 권고 버블용 속도계 아이콘 (메뉴 아이콘과 같은 선 스타일) */
export const GaugeIcon = (
  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.2 17.5a9 9 0 1 1 15.6 0" />
    <path d="M12 13.5l3.5-4" />
    <circle cx="12" cy="13.5" r="1.4" />
    <path d="M7 17.5h10" />
  </svg>
);

/** 지도 타입(레이어) 아이콘 */
export const LayersIcon = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0F172A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3 2.5 8 12 13l9.5-5L12 3Z" />
    <path d="M2.5 12 12 17l9.5-5" />
    <path d="M2.5 16 12 21l9.5-5" />
  </svg>
);
