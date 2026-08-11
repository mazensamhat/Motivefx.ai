import { json } from "@/lib/api";
import { fetchSharpActionWithMeta, ODDS_CACHE_TTL_MS } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") ?? "all";
  const result = await fetchSharpActionWithMeta(sport);
  const ttlMs = result.cacheTtlMs ?? ODDS_CACHE_TTL_MS;
  const sec = Math.max(60, Math.round(ttlMs / 1000));
  return json(
    {
      items: result.items,
      source: result.source,
      updatedAt: result.updatedAt,
      error: result.error ?? null,
      derivedNote: result.derivedNote ?? null,
      provider: result.provider ?? null,
      cacheTtlMs: ttlMs,
    },
    200,
    {
      headers: {
        "Cache-Control": `public, s-maxage=${sec}, stale-while-revalidate=${sec * 2}`,
      },
    }
  );
}
