import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import { fetchLineMoves, demoSharpAction } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "betting");
    const lines = await fetchLineMoves();
    const sharp = demoSharpAction();
    const summaries = sharp.map((s) => ({
      matchup: s.matchup,
      sharpSide: s.sharpSide,
      publicPct: s.publicPct,
      signal: s.signal,
    }));
    return json({ items: lines, summaries, count: lines.length });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
