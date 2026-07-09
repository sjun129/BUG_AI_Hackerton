import { getControlRoomBriefing } from "@/backend/services/control-room-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  return Response.json(await getControlRoomBriefing());
}
