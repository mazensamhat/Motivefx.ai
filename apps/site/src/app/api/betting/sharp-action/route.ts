import { json } from "@/lib/api";
import { fetchSharpActionWithMeta } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await fetchSharpActionWithMeta();
  return json({
    items: result.items,
    source: result.source,
    updatedAt: result.updatedAt,
    error: result.error ?? null,
  });
}
