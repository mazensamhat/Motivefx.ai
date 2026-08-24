import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { scanUnusualOptionsWithMeta } from "@/lib/terminal/feeds";
import { getDataMode, resolveFeedDataMode } from "@/lib/terminal/market-truth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "trades");
    const feedMode = await resolveFeedDataMode(request);
    const result = scanUnusualOptionsWithMeta(feedMode);
    return json({
      items: result.items,
      meta: {
        dataMode: feedMode,
        signalDataMode: getDataMode(),
        status: result.status,
        sourceType: result.sourceType,
        provider: result.provider,
        updatedAt: result.updatedAt,
        error: result.error,
      },
    });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
