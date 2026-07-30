import { json } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { genomeForSymbol, buildMarketGenomes } from "@/lib/terminal/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  const briefing = await buildHomeBriefing({ userId: "demo" });
  const opps = (briefing.opportunities as Array<Record<string, unknown>>) ?? [];
  if (symbol) {
    const genome = genomeForSymbol(opps as never[], symbol);
    return json({ genome });
  }
  return json({ genomes: buildMarketGenomes(opps as never[]) });
}
