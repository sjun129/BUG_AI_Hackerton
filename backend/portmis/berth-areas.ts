// Port-MIS 선석명 → 부두(BerthArea) 매칭. seed-port의 berthAreas 키워드로 분류한다.
// 좌표는 부두 단위 근사값이라, 정확한 선석 단위 위치가 아니라 "어느 부두인지" 분류가 목적.

import type { BerthArea, PortConfig } from "../ports/port-types";

export function resolveBerthArea(
  berthName: string | undefined | null,
  config: PortConfig
): BerthArea | undefined {
  if (!berthName) return undefined;
  return config.berthAreas.find((area) => area.keywords.some((k) => berthName.includes(k)));
}
