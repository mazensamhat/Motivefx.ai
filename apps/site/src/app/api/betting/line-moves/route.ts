import { json } from "@/lib/api";
import {
  fetchLineMovesWithMeta,
  getOddsApiQuota,
  getSharpApiQuota,
  ODDS_CACHE_TTL_MS,
} from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

function slateCacheHeaders(ttlMs: number): HeadersInit {
  const sec = Math.max(60, Math.round(ttlMs / 1000));
  return {
    "Cache-Control": `public, s-maxage=${sec}, stale-while-revalidate=${sec * 2}`,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") ?? "all";
  const result = await fetchLineMovesWithMeta(sport);
  const ttlMs = result.cacheTtlMs ?? ODDS_CACHE_TTL_MS;
  return json(
    {
      items: result.items,
      source: result.source,
      provider: result.provider ?? null,
      updatedAt: result.updatedAt,
      error: result.error ?? null,
      cacheTtlMs: ttlMs,
      quota: {
        sharp_api: getSharpApiQuota(),
        the_odds_api: getOddsApiQuota(),
      },
    },
    200,
    { headers: slateCacheHeaders(ttlMs) }
  );
}
