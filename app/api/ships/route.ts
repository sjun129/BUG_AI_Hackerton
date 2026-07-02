import { fetchShips } from "@/backend/ais/ship-source";

export const runtime = "nodejs";

export async function GET() {
  const ships = await fetchShips();
  return Response.json(ships);
}
