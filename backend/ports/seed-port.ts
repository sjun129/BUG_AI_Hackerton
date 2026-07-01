// ★ 항만 고유 설정 — 좌표·선석·구역·임계값을 이 파일 한 곳에 몰아넣는다.
// 다른 항만으로 플랫폼을 옮기고 싶으면 이 파일만 교체하면 된다.
// 나머지 코드(backend/prediction, backend/advisor, frontend/components)는
// 이 파일이 내보내는 BUSAN_PORT 를 읽어서 동작할 뿐, 좌표·임계값을 직접 갖지 않는다.

import type { PortConfig } from "./port-types";

export const BUSAN_PORT: PortConfig = {
  name: "부산항",
  center: { lat: 35.05, lon: 129.08 },
  mockAreaRadiusKm: 25,

  berths: [
    { id: "berth-1", name: "감만부두 1번 선석", lat: 35.078, lon: 129.081, capacity: 2 },
    { id: "berth-2", name: "감만부두 2번 선석", lat: 35.075, lon: 129.086, capacity: 2 },
    { id: "berth-3", name: "신선대부두 1번 선석", lat: 35.062, lon: 129.108, capacity: 3 },
    { id: "berth-4", name: "신선대부두 2번 선석", lat: 35.058, lon: 129.112, capacity: 3 },
    { id: "berth-5", name: "북항 1부두", lat: 35.101, lon: 129.041, capacity: 2 },
    { id: "berth-6", name: "북항 2부두", lat: 35.104, lon: 129.038, capacity: 2 },
  ],

  zones: [
    { id: "zone-anchorage", name: "묘박지", center: { lat: 35.02, lon: 129.13 }, radiusKm: 8 },
    { id: "zone-approach", name: "접근수로", center: { lat: 35.04, lon: 129.15 }, radiusKm: 10 },
    { id: "zone-port-limit", name: "항계", center: { lat: 35.05, lon: 129.08 }, radiusKm: 15 },
  ],

  // level = 0.0~0.3 원활, 0.3~0.6 보통, 0.6~1.0 혼잡
  congestionThresholds: { low: 0.3, medium: 0.6 },

  // 시간당 이 척수를 초과해 입항하면 혼잡도 level = 1(포화)로 간주
  shipsPerHourCapacity: 4,
};
