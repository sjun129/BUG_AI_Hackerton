import { MOCK_SHIPS } from "@/backend/ais/mock-data";

export async function GET() {
  return Response.json(MOCK_SHIPS);
}
