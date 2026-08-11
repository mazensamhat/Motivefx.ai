import { json } from "@/lib/api";
import {
  fetchPredictionMarketsWithMeta,
  POLYMARKET_CACHE_TTL_MS,
} from "@/lib/terminal/feeds";
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

/** Never let Bitquery delay or dominate the Gamma board. */
const BITQUERY_ENRICHMENT_LIMIT = 2;

async function bitqueryEnrichment(limit: number): Promise<BitquerySoft> {
  try {
    return await Promise.race([
      fetchBitquerySportsMarkets(Math.min(BITQUERY_ENRICHMENT_LIMIT, limit)),
      new Promise<BitquerySoft>((resolve) => {
        setTimeout(() => resolve({ items: [], coolingDown: true }), 2_500);
      }),
    ]);
  } catch {
    return { items: [] };
  }
}

function slateCacheHeaders(ttlMs: number): HeadersInit {
  const sec = Math.max(60, Math.round(ttlMs / 1000));
  return {
    "Cache-Control": `public, s-maxage=${sec}, stale-while-revalidate=${sec * 2}`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const category = url.searchParams.get("category");

  // Gamma first — solid primary board (shared ~15 min slate cache).
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
      const extra = bq.items
        .filter((m) => !seen.has(m.market.toLowerCase()))
        .slice(0, BITQUERY_ENRICHMENT_LIMIT);
      if (category) {
        items = [...items, ...extra];
      } else {
        const gammaCount = Math.max(0, limit - extra.length);
        items = [...items.slice(0, gammaCount), ...extra];
      }
    }
  }

  if (category) items = items.filter((m) => m.category === category).slice(0, limit);
  else items = items.slice(0, limit);

  const ttlMs = result.cacheTtlMs ?? POLYMARKET_CACHE_TTL_MS;
  return json(
    {
      items,
      source: result.source,
      provider: result.provider ?? "polymarket_gamma",
      updatedAt: result.updatedAt,
      error: result.error ?? null,
      cacheTtlMs: ttlMs,
      bitquery: {
        enabled: isBitqueryEnabled(),
        count: bitqueryCount,
        cached: bitqueryCached,
        coolingDown: bitqueryCoolingDown,
        error: null,
      },
    },
    200,
    { headers: slateCacheHeaders(ttlMs) }
  );
}
