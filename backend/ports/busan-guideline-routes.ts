// 부산항 접근 경로(실측) — 해수부 "항만가이드라인 항로(GIS)" (data.go.kr 15121382, 2026-06-07 기준).
// 원본은 항로별 통항 회랑을 WGS84 WKT POLYGON으로 제공한다(선이 아니라 면). 이 파일은 그 회랑
// 폴리곤에서 중심선을 추출(양 끝 tip에서 링을 두 갈래로 분할 → 아크길이 리샘플 → 중점 평균)해
// ApproachRoute waypoint(외해측→항측)로 변환한 결과다. 좌표 없는 항로(기상악화·입항)는 제외.
//   재생성: scripts 없이 1회 변환(scratchpad/gen-routes.mjs). 좌표계 변환 불필요(원본이 이미 WGS84).
// ⚠️ 도선/항해 지시가 아니라 시뮬레이션 경로 비교용. CLAUDE.md: 항만 데이터는 backend/ports에만 둔다.

import type { ApproachRoute } from "./port-types";

export const BUSAN_GUIDELINE_APPROACH_ROUTES: ApproachRoute[] = [
  {
    id: "gl-busan-north-fairway-1",
    destinationPortId: "busan-north",
    name: "제1항로 (부산항로)",
    shortName: "제1항로",
    source: "mof-guideline-route",
    description: "해수부 항만가이드라인 지정항로(제1항로 (부산항로)) · 수심 14.8~34m · 너비 340~340m · 중심선 길이 3.45NM",
    waypoints: [
    { lat: 35.070056, lng: 129.114111, label: "제1항로 외해측" },
    { lat: 35.080852, lng: 129.107273 },
    { lat: 35.089914, lng: 129.091728 },
    { lat: 35.098977, lng: 129.076182 },
    { lat: 35.108389, lng: 129.063306, label: "제1항로 항측" },
    ],
  },
  {
    id: "gl-busan-north-inner-4",
    destinationPortId: "busan-north",
    name: "제4항로 (북내항로)",
    shortName: "제4항로(북내)",
    source: "mof-guideline-route",
    description: "해수부 항만가이드라인 지정항로(제4항로 (북내항로)) · 수심 6~8.1m · 너비 55~55m · 중심선 길이 0.25NM",
    waypoints: [
    { lat: 35.096139, lng: 129.039083, label: "제4항로(북내) 외해측" },
    { lat: 35.096982, lng: 129.039693 },
    { lat: 35.097773, lng: 129.040668 },
    { lat: 35.098564, lng: 129.041643 },
    { lat: 35.099361, lng: 129.042194, label: "제4항로(북내) 항측" },
    ],
  },
  {
    id: "gl-busan-north-outer-2",
    destinationPortId: "busan-north",
    name: "제2항로 (남외항로)",
    shortName: "제2항로(남외항)",
    source: "mof-guideline-route",
    description: "해수부 항만가이드라인 지정항로(제2항로 (남외항로)) · 수심 5.6~35m · 너비 125~525m · 중심선 길이 2.54NM",
    waypoints: [
    { lat: 35.044306, lng: 129.037083, label: "제2항로(남외항) 외해측" },
    { lat: 35.053216, lng: 129.033518 },
    { lat: 35.064247, lng: 129.03297 },
    { lat: 35.075279, lng: 129.032422 },
    { lat: 35.086069, lng: 129.031289, label: "제2항로(남외항) 항측" },
    ],
  },
  {
    id: "gl-gamcheon-fairway-3",
    destinationPortId: "gamcheon",
    name: "제3항로 (감천항로)",
    shortName: "제3항로",
    source: "mof-guideline-route",
    description: "해수부 항만가이드라인 지정항로(제3항로 (감천항로)) · 수심 12.7~16.5m · 너비 250~400m · 중심선 길이 1.67NM",
    waypoints: [
    { lat: 35.04675, lng: 129.015194, label: "제3항로 외해측" },
    { lat: 35.049932, lng: 129.008079 },
    { lat: 35.056298, lng: 129.003595 },
    { lat: 35.0635, lng: 129.001905 },
    { lat: 35.069778, lng: 128.999916, label: "제3항로 항측" },
    ],
  },
  {
    id: "gl-gamcheon-outbound",
    destinationPortId: "gamcheon",
    name: "출항항로 (감천항로)",
    shortName: "출항항로",
    source: "mof-guideline-route",
    description: "해수부 항만가이드라인 지정항로(출항항로 (감천항로)) · 중심선 길이 1.06NM",
    waypoints: [
    { lat: 35.031722, lng: 129.025694, label: "출항항로 외해측" },
    { lat: 35.03585, lng: 129.024959 },
    { lat: 35.039408, lng: 129.02174 },
    { lat: 35.042934, lng: 129.018093 },
    { lat: 35.04675, lng: 129.015194, label: "출항항로 항측" },
    ],
  },
  {
    id: "gl-gamcheon-separation",
    destinationPortId: "gamcheon",
    name: "분리대 (감천항로)",
    shortName: "분리대",
    source: "mof-guideline-route",
    description: "해수부 항만가이드라인 지정항로(분리대 (감천항로)) · 중심선 길이 1.56NM",
    waypoints: [
    { lat: 35.022694, lng: 129.022889, label: "분리대 외해측" },
    { lat: 35.025951, lng: 129.018045 },
    { lat: 35.032886, lng: 129.01612 },
    { lat: 35.039725, lng: 129.014002 },
    { lat: 35.04575, lng: 129.01025, label: "분리대 항측" },
    ],
  },
  {
    id: "gl-busan-new-fairway-5",
    destinationPortId: "busan-new",
    name: "제5항로 (신항항로)",
    shortName: "제5항로",
    source: "mof-guideline-route",
    description: "해수부 항만가이드라인 지정항로(제5항로 (신항항로)) · 수심 14.2~17.7m · 너비 1150~1915m · 중심선 길이 2.13NM",
    waypoints: [
    { lat: 35.0342, lng: 128.792314, label: "제5항로 외해측" },
    { lat: 35.040777, lng: 128.783589 },
    { lat: 35.048548, lng: 128.779203 },
    { lat: 35.058372, lng: 128.783786 },
    { lat: 35.064444, lng: 128.780278, label: "제5항로 항측" },
    ],
  },
];
