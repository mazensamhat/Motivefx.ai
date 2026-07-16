import { json } from "@/lib/api";
import {
  fetchBitquerySportsMarkets,
  isBitqueryConfigured,
  isBitqueryEnabled,
} from "@/lib/terminal/feeds/bitquery";

export const dynamic = "force-dynamic";

/** Optional Bitquery sports/esports enrichment — requires BITQUERY_API_KEY. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 12), 40);
  if (!isBitqueryEnabled()) {
    return json({
      items: [],
      source: "off",
      configured: isBitqueryConfigured(),
      enabled: false,
      error:
        "Bitquery enrichment off — set BITQUERY_API_KEY (Bearer token from account.bitquery.io). Optional BITQUERY_ENABLED=false disables calls while keeping the key.",
      docs: "https://docs.bitquery.io/docs/examples/polymarket-api/polymarket-sports-api/",
    });
  }
  const result = await fetchBitquerySportsMarkets(limit);
  return json({
    items: result.items,
    source: result.items.length ? "bitquery" : "empty",
    configured: true,
    enabled: true,
    error: result.error ?? null,
    count: result.items.length,
  });
}
