import { fetchShips } from "@/backend/ais/ship-source";
import { BUSAN_PORT } from "@/backend/ports/seed-port";
import { computeCongestionForecast } from "@/backend/prediction/congestion";

export const runtime = "nodejs";

export async function GET() {
  const ships = await fetchShips();
  const forecast = computeCongestionForecast(ships, BUSAN_PORT);
  return Response.json(forecast);
}
