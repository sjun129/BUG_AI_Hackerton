import { MOCK_SHIPS } from "@/backend/ais/mock-data";
import { BUSAN_PORT } from "@/backend/ports/seed-port";
import { computeCongestionForecast } from "@/backend/prediction/congestion";

export async function GET() {
  const forecast = computeCongestionForecast(MOCK_SHIPS, BUSAN_PORT);
  return Response.json(forecast);
}
