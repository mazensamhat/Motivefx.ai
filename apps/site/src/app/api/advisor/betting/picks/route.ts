import { json } from "@/lib/api";
import { accessErrorResponse, requireTerminalSession } from "@/lib/terminal/auth";
import { requireModule } from "@/lib/terminal/access";
import { planForUser } from "@/lib/terminal/plan";
import { demoSharpAction } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const sharp = demoSharpAction();
  const picks = sharp.map((s) => ({
    symbol: s.matchup,
    action: "buy",
    confidence: s.confidence === "high" ? 72 : 64,
    headline: `Sharp side: ${s.sharpSide}`,
    reasoning: `Public ${s.publicPct}% vs money ${s.moneyPct}%.`,
    signals: ["Sharp Money"],
  }));
  return json({ picks });
}
