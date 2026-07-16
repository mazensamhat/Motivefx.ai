import { json } from "@/lib/api";
import {
  fetchLineMovesWithMeta,
  getOddsApiQuota,
  getSharpApiQuota,
} from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") ?? "baseball_mlb";
  const result = await fetchLineMovesWithMeta(sport);
  return json({
    items: result.items,
    source: result.source,
    provider: result.provider ?? null,
    updatedAt: result.updatedAt,
    error: result.error ?? null,
    quota: {
      sharp_api: getSharpApiQuota(),
      the_odds_api: getOddsApiQuota(),
    },
  });
}
