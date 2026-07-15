import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { fetchLineMoves, fetchSharpActionWithMeta } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "betting");
    const [lines, sharp] = await Promise.all([fetchLineMoves(), fetchSharpActionWithMeta()]);
    const summaries = sharp.items.map((s) => ({
      matchup: s.matchup,
      sharpSide: s.sharpSide,
      publicPct: s.publicPct,
      signal: s.signal,
    }));
    return json({
      items: lines,
      summaries,
      count: lines.length,
      sharpError: sharp.error ?? null,
    });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
