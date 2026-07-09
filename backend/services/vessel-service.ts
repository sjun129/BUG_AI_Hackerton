import { fetchShips } from "@/backend/ais/ship-source";
import { resolveCongestion } from "@/backend/congestion/resolve-congestion";
import { haversineDistanceKm } from "@/backend/prediction/eta";
import { recommendSpeed } from "@/backend/prediction/speed-advisory";
import { computeCiiStatus } from "@/backend/prediction/cii";
import { fetchPortCalls } from "@/backend/portmis/portcall-source";
import { BUSAN_PORT } from "@/backend/ports/seed-port";
import { buildVesselView, monitorCandidates, type VesselView } from "@/backend/vessel/build-view";

function buildAdvisory(view: VesselView, level: number) {
  if (view.status !== "underway" || !view.position || view.speedKn == null || view.speedKn < 1) return null;

  const distanceNm = haversineDistanceKm(view.position, BUSAN_PORT.center) / 1.852;
  if (distanceNm < 5 || distanceNm > 800) return null;

  const currentInPort = level * BUSAN_PORT.portCallCapacity.portWide.p99;
  return recommendSpeed(
    {
      vesselType: view.type ?? undefined,
      grossTonnage: view.grossTonnage ?? undefined,
      distanceNm,
      currentSpeedKn: view.speedKn,
      currentInPort,
    },
    BUSAN_PORT
  );
}

export async function getVesselMonitorData(now: Date = new Date()) {
  const [ships, portCalls, congestion] = await Promise.all([
    fetchShips(),
    fetchPortCalls(),
    resolveCongestion(now),
  ]);
  const level = congestion.currentLevel ?? 0;

  const items = monitorCandidates(ships, portCalls)
    .slice(0, 40)
    .map((candidate, index) => {
      const view = buildVesselView(candidate, now);
      if (!view) return null;
      return {
        id: `${view.callSign ?? view.name}-${index}`,
        label: candidate.call.vesselName,
        hasMatchedShip: Boolean(candidate.ship),
        view,
        cii: computeCiiStatus(view.type ?? undefined, view.grossTonnage ?? undefined, now.getFullYear()),
        advisory: buildAdvisory(view, level),
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    source: "vessel-monitor",
    lastUpdated: now.toISOString(),
    port: BUSAN_PORT.name,
    congestion: {
      currentLevel: level,
      source: congestion.source,
      basis: congestion.basis,
      lastUpdated: congestion.lastUpdated,
    },
    items,
  };
}
