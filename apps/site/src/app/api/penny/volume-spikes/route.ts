import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { scanVolumeSpikes } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "penny");
    return json({ items: scanVolumeSpikes() });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
