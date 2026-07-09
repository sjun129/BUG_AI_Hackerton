import {
  getLiveEnergyDecisions,
  getSimulationEnergyDecisions,
  type SimulationEnergyDecisionRequest,
} from "@/backend/services/energy-decisions-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  return Response.json(await getLiveEnergyDecisions());
}

export async function POST(request: Request) {
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const data =
    body && typeof body === "object"
      ? (body as Partial<SimulationEnergyDecisionRequest>)
      : {};

  return Response.json(await getSimulationEnergyDecisions({ simulatedShips: data.simulatedShips ?? [], congestionMode: data.congestionMode }));
}
