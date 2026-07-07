import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { fetchWhaleAlerts } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "crypto");
    const items = (await fetchWhaleAlerts()).map((w) => ({
      symbol: w.asset,
      side: w.direction?.includes("deposit") ? "BUY" : "SELL",
      amount: w.amountUsd,
      timestamp: w.timestamp,
      note: (w as { note?: string }).note ?? w.direction,
    }));
    return json({ items, count: items.length });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
