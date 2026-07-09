import { json } from "@/lib/api";
import {
  fetchWhaleAlerts,
  fetchLineMoves,
  scanUnusualOptions,
  scanPennyMovers,
} from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

export async function GET() {
  const [whales, options, lines, penny] = await Promise.all([
    fetchWhaleAlerts(),
    Promise.resolve(scanUnusualOptions()),
    fetchLineMoves(),
    Promise.resolve(scanPennyMovers()),
  ]);

  const events: Array<Record<string, unknown>> = [];

  for (const w of whales.slice(0, 2)) {
    const usd = Number(w.amountUsd) || 0;
    const pretty =
      usd >= 1_000_000_000
        ? `$${(usd / 1_000_000_000).toFixed(1)}B`
        : usd >= 1_000_000
          ? `$${Math.round(usd / 1_000_000)}M`
          : `$${Math.round(usd).toLocaleString()}`;
    events.push({
      type: "crypto",
      severity: "high",
      message: `${String(w.asset)} whale moved ${pretty} — ${w.note ?? w.direction ?? ""}`,
      timestamp: w.timestamp,
    });
  }
  for (const o of options.slice(0, 2)) {
    events.push({
      type: "stock",
      severity: "medium",
      message: `Unusual $${o.symbol} ${String(o.type).toUpperCase()} activity — ${o.note ?? "block trade detected"}`,
      timestamp: o.timestamp,
    });
  }
  for (const line of lines.slice(0, 2)) {
    const opening = "openingLine" in line ? line.openingLine : "?";
    const current = "currentLine" in line ? line.currentLine : "?";
    events.push({
      type: "betting",
      severity: "medium",
      message: `Line move: ${line.matchup} opened ${opening} → now ${current}`,
      timestamp: "timestamp" in line ? line.timestamp : undefined,
    });
  }
  for (const p of penny.slice(0, 2)) {
    events.push({
      type: "penny",
      severity: "high",
      message: `$${p.symbol} pink slip ${Number(p.changePct).toFixed(1)}% — ${p.note ?? "volume spike"}`,
      timestamp: p.timestamp,
    });
  }

  return json({ events });
}
