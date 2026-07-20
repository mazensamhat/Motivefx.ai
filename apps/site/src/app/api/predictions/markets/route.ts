import { json } from "@/lib/api";
import { fetchPredictionMarketsWithMeta } from "@/lib/terminal/feeds";
import {
  fetchBitquerySportsMarkets,
  isBitqueryEnabled,
} from "@/lib/terminal/feeds/bitquery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const category = url.searchParams.get("category");
  const result = await fetchPredictionMarketsWithMeta(category ? Math.max(limit * 3, 40) : limit);
  let items = result.items;
  let bitqueryNote: string | null = null;
  let bitqueryCount = 0;

  // Optional enrichment: Bitquery on-chain Polymarket sports (cricket/NBA/NFL/esports).
  // Gamma remains primary; Bitquery never replaces it.
  // Skip Bitquery inject when the client asked for a non-sports category — otherwise
  // cricket/tennis rows crowd out politics/crypto filters.
  if (isBitqueryEnabled() && (!category || category === "sports")) {
    const bq = await fetchBitquerySportsMarkets(Math.min(10, limit));
    bitqueryNote = bq.error ?? null;
    if (bq.items.length) {
      bitqueryCount = bq.items.length;
      const seen = new Set(items.map((m) => m.market.toLowerCase()));
      const extra = bq.items.filter((m) => !seen.has(m.market.toLowerCase()));
      items = [...extra.slice(0, 8), ...items].slice(0, Math.max(limit * 2, limit));
    }
  }

  if (category) items = items.filter((m) => m.category === category).slice(0, limit);
  else items = items.slice(0, limit);
  return json({
    items,
    source: result.source,
    updatedAt: result.updatedAt,
    error: result.error ?? null,
    bitquery: {
      enabled: isBitqueryEnabled(),
      count: bitqueryCount,
      error: bitqueryNote,
    },
  });
}
