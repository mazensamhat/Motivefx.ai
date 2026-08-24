import { json } from "@/lib/api";
import { fetchWhaleAlerts } from "@/lib/terminal/feeds";
import { getDataMode, resolveFeedDataMode } from "@/lib/terminal/market-truth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const feedMode = await resolveFeedDataMode(request);
  const items = await fetchWhaleAlerts(feedMode);
  return json({
    items,
    meta: {
      dataMode: feedMode,
      signalDataMode: getDataMode(),
    },
  });
}
