import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { fetchPredictionMarkets } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "predictions");
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
    const items = (await fetchPredictionMarkets(limit)).map((m) => ({
      market: m.market,
      category: m.category,
      pick: Number(m.yes) >= 0.5 ? "Yes" : "No",
      stake: 100,
      yes_price: m.yes,
      platform: m.platform,
    }));
    return json({ items, count: items.length });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
