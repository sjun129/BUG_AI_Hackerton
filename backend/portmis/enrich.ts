// AIS로 잡힌 선박(Ship)에 Port-MIS 입출항 신고 정보를 매칭해 붙인다.
// 매칭 키: 호출부호(callSign, 우선) → 없으면 선박명(대체). Port-MIS는 실시간 위치가 없는
// "신고 이벤트" 데이터라 Ship의 위경도·속력·침로는 절대 건드리지 않는다.

import type { Ship } from "../ports/port-types";
import type { PortMisItem } from "./types";

function normalizeCallSign(cs: string | undefined): string {
  return (cs ?? "").trim().toUpperCase();
}

function normalizeName(name: string | undefined): string {
  return (name ?? "").replace(/\s+/g, "").trim().toUpperCase();
}

export interface ShipEnrichment {
  callSign?: string;
  previousPort?: string;
  nextPort?: string;
  berthName?: string;
  grossTonnage?: number;
  crewCount?: number;
  agentCompany?: string;
}

// 같은 선박에 대해 입항/출항 등 여러 건이 잡힐 수 있어, 신고 시각이 가장 최신인 detail을 쓴다.
function latestDetail(item: PortMisItem) {
  return [...item.details]
    .filter((d) => d.etryptDt || d.tkoffDt)
    .sort((a, b) => {
      const at = new Date(a.tkoffDt ?? a.etryptDt ?? 0).getTime();
      const bt = new Date(b.tkoffDt ?? b.etryptDt ?? 0).getTime();
      return bt - at;
    })[0];
}

/** ship과 매칭되는 Port-MIS 신고 건을 찾아 보강 필드를 반환한다. 매칭 안 되면 null. */
export function matchEnrichment(ship: Ship, items: PortMisItem[]): ShipEnrichment | null {
  const shipCallSign = normalizeCallSign(ship.callSign);
  const shipName = normalizeName(ship.name);

  const match =
    (shipCallSign && items.find((i) => normalizeCallSign(i.clsgn) === shipCallSign)) ||
    items.find((i) => normalizeName(i.vsslNm) === shipName);

  if (!match) return null;

  const detail = latestDetail(match);
  return {
    callSign: match.clsgn || undefined,
    previousPort: match.prvsDpmprtPrtNm,
    nextPort: match.nxlnptPrtNm,
    berthName: detail?.laidupFcltyNm,
    grossTonnage: detail?.grtg ? Number(detail.grtg) : undefined,
    crewCount: detail?.crewCo ? Number(detail.crewCo) : undefined,
    agentCompany: detail?.satmntEntrpsNm,
  };
}
