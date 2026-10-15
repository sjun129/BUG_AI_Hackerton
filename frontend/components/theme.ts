// 대시보드(관제 지도) 라이트 테마 팔레트 — 패널·텍스트·강조색을 한 곳에서 관리한다.
// 컴포넌트들이 이 토큰을 공유해 밝은 테마를 일관되게 유지한다.
export const LT = {
  pageBg: "#e9edf3", // 페이지 배경(지도 위 여백)
  panel: "rgba(255,255,255,0.92)", // 유리판 패널 배경(블러와 함께)
  panelSolid: "#ffffff",
  border: "1px solid rgba(15,23,42,0.08)",
  borderColor: "rgba(15,23,42,0.08)",
  ink: "#0f172a", // 기본 텍스트(짙은 남색)
  inkSoft: "#334155", // 보조 텍스트
  muted: "#64748b", // 흐린 라벨
  tile: "#f1f5f9", // 카드 안 작은 타일 배경
  shadow: "0 10px 30px rgba(15,23,42,0.12)",
  // 강조색(밝은 배경에서 대비 확보)
  blue: "#2563eb",
  blueSoft: "rgba(37,99,235,0.10)",
  sky: "#0ea5e9",
  green: "#16a34a",
  amber: "#e8952b",
  red: "#ef4444",
} as const;
