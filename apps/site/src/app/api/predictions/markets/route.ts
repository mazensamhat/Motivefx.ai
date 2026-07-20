import { json } from "@/lib/api";
import { fetchPredictionMarketsWithMeta } from "@/lib/terminal/feeds";
import {
  fetchBitquerySportsMarkets,
  isBitqueryEnabled,
  type BitqueryMarketItem,
} from "@/lib/terminal/feeds/bitquery";

export const dynamic = "force-dynamic";

type BitquerySoft = {
  items: BitqueryMarketItem[];
  cached?: boolean;
  coolingDown?: boolean;
  stale?: boolean;
  error?: string;
};

/** Never let Bitquery delay the Gamma board. */
async function bitqueryEnrichment(limit: number): Promise<BitquerySoft> {
  try {
    return await Promise.race([
      fetchBitquerySportsMarkets(Math.min(10, limit)),
      new Promise<BitquerySoft>((resolve) => {
        setTimeout(() => resolve({ items: [], coolingDown: true }), 2_500);
      }),
    ]);
  } catch {
    return { items: [] };
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const category = url.searchParams.get("category");

  // Gamma first — this is the solid primary board.
  const result = await fetchPredictionMarketsWithMeta(category ? Math.max(limit * 3, 40) : limit);
  let items = result.items;
  let bitqueryCount = 0;
  let bitqueryCached = false;
  let bitqueryCoolingDown = false;

  // Optional enrichment only for sports (or unfiltered boards). Soft-fail always.
  if (isBitqueryEnabled() && (!category || category === "sports")) {
    const bq = await bitqueryEnrichment(limit);
    bitqueryCached = Boolean(bq.cached || bq.stale);
    bitqueryCoolingDown = Boolean(bq.coolingDown);
    if (bq.items.length) {
      bitqueryCount = bq.items.length;
      const seen = new Set(items.map((m) => m.market.toLowerCase()));
      const extra = bq.items.filter((m) => !seen.has(m.market.toLowerCase()));
      items = [...extra.slice(0, 8), ...items];
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
      cached: bitqueryCached,
      coolingDown: bitqueryCoolingDown,
      error: null,
    },
  });
}
