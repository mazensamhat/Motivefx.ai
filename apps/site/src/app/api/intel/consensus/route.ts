import { json } from "@/lib/api";
import { buildHomeBriefing } from "@/lib/terminal/home-briefing";
import { detectConsensusBreaks } from "@/lib/terminal/engines";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET() {
  const briefing = await buildHomeBriefing({ userId: "demo" });
  const opps = (briefing.opportunities as Array<Record<string, unknown>>) ?? [];
  const sentiment = (briefing.sentiment as { reddit?: string; x?: string; news?: string }) ?? {};
  const label = String(briefing.marketConfidence ?? "MODERATE");
  const breaks = detectConsensusBreaks(opps as never[], sentiment, label);
  return json({ consensusBreaks: breaks });
}
