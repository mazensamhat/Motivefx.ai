import { json } from "@/lib/api";
import { fetchSharpActionWithMeta } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sport = url.searchParams.get("sport") ?? "all";
  const result = await fetchSharpActionWithMeta(sport);
  return json({
    items: result.items,
    source: result.source,
    updatedAt: result.updatedAt,
    error: result.error ?? null,
    derivedNote: result.derivedNote ?? null,
    provider: result.provider ?? null,
  });
}
