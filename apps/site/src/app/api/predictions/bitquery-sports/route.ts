import { json } from "@/lib/api";
import {
  fetchBitquerySportsMarkets,
  getBitqueryQuotaStatus,
  isBitqueryConfigured,
  isBitqueryEnabled,
} from "@/lib/terminal/feeds/bitquery";

export const dynamic = "force-dynamic";

/** Optional Bitquery sports/esports enrichment — requires BITQUERY_API_KEY. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 12), 40);
  const quota = getBitqueryQuotaStatus();

  if (!isBitqueryEnabled()) {
    return json({
      items: [],
      source: "off",
      configured: isBitqueryConfigured(),
      enabled: false,
      error:
        "Bitquery enrichment off — set BITQUERY_API_KEY (Bearer token from account.bitquery.io). Optional BITQUERY_ENABLED=false disables calls while keeping the key.",
      docs: "https://docs.bitquery.io/docs/examples/polymarket-api/polymarket-sports-api/",
      quota,
    });
  }

  const result = await fetchBitquerySportsMarkets(limit);
  const source = result.items.length
    ? result.stale || result.cached
      ? "bitquery_cache"
      : "bitquery"
    : result.coolingDown
      ? "cooldown"
      : "empty";

  return json({
    items: result.items,
    source,
    configured: true,
    enabled: true,
    // Only expose errors when we truly have nothing to show.
    error: result.items.length ? null : result.error ?? null,
    count: result.items.length,
    cached: Boolean(result.cached || result.stale),
    stale: Boolean(result.stale),
    coolingDown: Boolean(result.coolingDown),
    quota,
  });
}
