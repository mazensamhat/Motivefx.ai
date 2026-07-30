import { json } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { buildProbabilityViews } from "@/lib/terminal/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const theme = url.searchParams.get("theme");
  const briefing = await buildHomeBriefing({ userId: "demo" });
  const opps = (briefing.opportunities as Array<Record<string, unknown>>) ?? [];
  const views = buildProbabilityViews(opps as never[]);
  if (theme) {
    const hit =
      views.find((v) => v.theme.toLowerCase().includes(theme.toLowerCase())) ??
      views.find((v) => v.id === theme);
    return json({ view: hit ?? null, views });
  }
  return json({ views });
}
