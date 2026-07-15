import { json } from "@/lib/api";
import { fetchPredictionMarketsWithMeta } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 20), 50);
  const category = url.searchParams.get("category");
  const result = await fetchPredictionMarketsWithMeta(limit);
  let items = result.items;
  if (category) items = items.filter((m) => m.category === category);
  return json({
    items,
    source: result.source,
    updatedAt: result.updatedAt,
    error: result.error ?? null,
  });
}
