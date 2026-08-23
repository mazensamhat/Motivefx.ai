import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { scanUnusualOptionsWithMeta } from "@/lib/terminal/feeds";
import { getDataMode } from "@/lib/terminal/market-truth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "trades");
    const result = scanUnusualOptionsWithMeta();
    return json({
      items: result.items,
      meta: {
        dataMode: getDataMode(),
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
