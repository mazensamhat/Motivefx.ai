import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { scanVolumeSpikes } from "@/lib/terminal/feeds";
import { getDataMode, resolveFeedDataMode } from "@/lib/terminal/market-truth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "penny");
    const feedMode = await resolveFeedDataMode(request);
    const items = scanVolumeSpikes(feedMode);
    return json({
      items,
      meta: {
        dataMode: feedMode,
        signalDataMode: getDataMode(),
      },
    });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
