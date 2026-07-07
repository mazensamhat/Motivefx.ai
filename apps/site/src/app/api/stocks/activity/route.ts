import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { scanUnusualOptions } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "trades");
    const items = scanUnusualOptions().map((o) => ({
      symbol: o.symbol,
      side: o.type === "call" ? "BUY" : "SELL",
      shares: o.volume,
      price: Math.round(Number(o.premium) / Math.max(Number(o.volume), 1)),
      timestamp: o.timestamp,
      note: o.note,
    }));
    return json({ items, count: items.length });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
