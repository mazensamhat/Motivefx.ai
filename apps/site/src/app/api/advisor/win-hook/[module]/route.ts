import { json } from "@/lib/api";
import { MODULE_CATALOG } from "@/lib/terminal/modules-catalog";

const WINS = [
  { city: "Austin", amount: 4200, signal: "NVDA call flow", detail: "Caught unusual options block before earnings run-up." },
  { city: "Miami", amount: 8900, signal: "BTC whale alert", detail: "Whale transfer flagged 6 hours before breakout." },
  { city: "Chicago", amount: 3100, signal: "Sharp line move", detail: "Fade-the-public split on NFL spread." },
];

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ module: string }> }) {
  const { module } = await ctx.params;
  const key = module in MODULE_CATALOG || module === "bundle" ? module : "trades";
  const win = WINS[Math.floor(Math.random() * WINS.length)];
  const label = key in MODULE_CATALOG || key === "bundle"
    ? key === "bundle"
      ? "All-Access"
      : MODULE_CATALOG[key as keyof typeof MODULE_CATALOG]?.name ?? "Trades"
    : "Trades";
  return json({
    module: key,
    city: win.city,
    amount: win.amount,
    amountFormatted: `$${win.amount.toLocaleString()}`,
    signal: win.signal,
    detail: win.detail,
    timeAgo: `${2 + Math.floor(Math.random() * 8)}h ago`,
    headline: `${win.city} trader turned ${label} signal into ${win.amount.toLocaleString()}*`,
  });
}
