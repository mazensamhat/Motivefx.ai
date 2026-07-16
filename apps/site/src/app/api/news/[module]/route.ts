import { json } from "@/lib/api";
import { fetchModuleNews, type NewsModule } from "@/lib/terminal/feeds/news";

export const dynamic = "force-dynamic";

const MODULES = new Set<NewsModule>(["trades", "penny", "crypto", "betting", "predictions"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ module: string }> }
) {
  const { module: rawModule } = await context.params;
  const module = rawModule as NewsModule;
  if (!MODULES.has(module)) {
    return json({ error: `Unknown module: ${rawModule}` }, 404);
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 10), 1), 30);
  const userId = url.searchParams.get("user_id")?.trim() || "demo";

  const result = await fetchModuleNews(module, limit, userId);
  return json({
    items: result.items,
    personalCount: result.personalCount,
    source: result.source,
    error: result.error ?? null,
    module,
  });
}
