// mock-generator.ts로 만든 선박에 실제 ETA(prediction/eta.ts)를 계산해 붙인
// 앱 전역 목업 데이터 싱글턴. 서버 프로세스가 살아있는 동안은 값이 고정된다.

import { BUSAN_PORT } from "../ports/seed-port";
import type { Ship } from "../ports/port-types";
import { generateMockShips } from "./mock-generator";
import { computeEta } from "../prediction/eta";

function withComputedEta(ship: Ship): Ship {
  if (ship.status !== "underway") return ship;

  const berth =
    BUSAN_PORT.berths.find((b) => b.id === ship.destinationBerthId) ?? BUSAN_PORT.berths[0];

  return {
    ...ship,
    eta: computeEta({ lat: ship.lat, lon: ship.lon }, { lat: berth.lat, lon: berth.lon }, ship.sog),
  };
}

export const MOCK_SHIPS: Ship[] = generateMockShips(BUSAN_PORT, { count: 18 }).map(withComputedEta);
