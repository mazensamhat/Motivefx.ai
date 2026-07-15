import { json } from "@/lib/api";
import { fetchLineMoves, SHARP_MONEY_UNAVAILABLE_MESSAGE } from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const lines = await fetchLineMoves();
  // Do not invent public/sharp splits — surface live moneyline context instead when available.
  const picks = lines.slice(0, 3).map((l) => ({
    symbol: l.matchup,
    action: "hold",
    confidence: 58,
    headline: l.currentLine ? `Live line: ${l.currentLine}` : "Live odds context",
    reasoning: `${l.sport} · ${l.book ?? "books"} — ${SHARP_MONEY_UNAVAILABLE_MESSAGE}`,
    signals: ["Line Movement"],
  }));
  return json({
    picks,
    error: picks.length ? null : SHARP_MONEY_UNAVAILABLE_MESSAGE,
  });
}
