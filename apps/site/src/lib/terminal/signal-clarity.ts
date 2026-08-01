/**
 * Per-ticker signal chip selection for home briefing (mirrors web/src/utils/signalClarity).
 */

export interface OpportunitySignalInput {
  module: string;
  symbol: string;
  type?: string;
  volOiRatio?: number;
  premium?: number;
  changePct?: number;
  volRatio?: number;
  amountUsd?: number;
  direction?: string;
  yesPct?: number;
  note?: string;
  side?: string;
  actorType?: string;
  seed?: number;
}

function hashSym(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const TRADES_POOL = [
  "Options Flow",
  "Unusual Volume",
  "Block Flow",
  "Call Bias",
  "Put Hedge",
  "Premium Spike",
  "Open Interest Shift",
  "AI Lens",
  "Congress Cross-Check",
] as const;

const PENNY_POOL = [
  "Unusual Volume",
  "Microcap Scanner",
  "Volume Breakout",
  "Thin Liquidity Flag",
  "Catalyst Watch",
  "AI Lens",
] as const;

const CRYPTO_POOL = [
  "Whale Transfer",
  "On-Chain",
  "Exchange Outflow",
  "Exchange Inflow",
  "Wallet Cluster",
  "AI Lens",
] as const;

const BETTING_POOL = ["Line Movement", "Sharp Money", "Public Split", "Steam Move", "AI Lens"] as const;

const PRED_POOL = ["Event Market", "24h Volume", "Odds Swing", "Crowd Consensus", "AI Lens"] as const;

function pickFromPool(pool: readonly string[], seed: number, count: number, forced: string[] = []): string[] {
  const out: string[] = [];
  for (const f of forced) {
    if ((pool as readonly string[]).includes(f) && !out.includes(f)) out.push(f);
  }
  let i = seed % pool.length;
  let guard = 0;
  while (out.length < count && guard < pool.length * 2) {
    const c = pool[i % pool.length];
    if (!out.includes(c)) out.push(c);
    i += 1 + (seed % 3);
    guard++;
  }
  return out.slice(0, count);
}

export function pickSignalsForOpportunity(input: OpportunitySignalInput): string[] {
  const sym = (input.symbol || "?").toUpperCase();
  const seed = input.seed ?? hashSym(`${input.module}:${sym}:${input.type ?? ""}:${input.note ?? ""}`);
  const mod = String(input.module);

  if (mod === "trades") {
    const forced: string[] = ["Options Flow"];
    if (String(input.type).toLowerCase() === "put") forced.push("Put Hedge");
    else if (String(input.type).toLowerCase() === "call") forced.push("Call Bias");
    if ((input.volOiRatio ?? 0) >= 5) forced.push("Unusual Volume");
    if ((input.premium ?? 0) >= 500_000) forced.push("Premium Spike");
    if (String(input.actorType).toLowerCase() === "institutional") forced.push("Block Flow");
    if ((input.note ?? "").toLowerCase().includes("congress")) forced.push("Congress Cross-Check");
    return pickFromPool(TRADES_POOL, seed, 3, forced);
  }

  if (mod === "penny" || mod === "pinkslips") {
    const forced: string[] = ["Microcap Scanner"];
    if (Math.abs(input.changePct ?? 0) >= 8) forced.push("Volume Breakout");
    if ((input.volRatio ?? 0) >= 3) forced.push("Unusual Volume");
    if (Math.abs(input.changePct ?? 0) >= 15) forced.push("Thin Liquidity Flag");
    else forced.push("Catalyst Watch");
    return pickFromPool(PENNY_POOL, seed, 3, forced);
  }

  if (mod === "crypto") {
    const forced: string[] = ["Whale Transfer"];
    const dir = String(input.direction ?? "").toLowerCase();
    if (dir.includes("out")) forced.push("Exchange Outflow");
    else if (dir.includes("in")) forced.push("Exchange Inflow");
    else forced.push("On-Chain");
    if ((input.amountUsd ?? 0) >= 10_000_000) forced.push("Wallet Cluster");
    return pickFromPool(CRYPTO_POOL, seed, 3, forced);
  }

  if (mod === "betting") {
    const forced: string[] = ["Line Movement"];
    if (seed % 2 === 0) forced.push("Sharp Money");
    else forced.push("Public Split");
    return pickFromPool(BETTING_POOL, seed, 2, forced);
  }

  if (mod === "predictions") {
    const forced: string[] = ["Event Market"];
    if ((input.yesPct ?? 50) >= 65 || (input.yesPct ?? 50) <= 35) forced.push("Odds Swing");
    else forced.push("Crowd Consensus");
    return pickFromPool(PRED_POOL, seed, 3, forced);
  }

  return pickFromPool(TRADES_POOL, seed, 3, ["AI Lens"]);
}

export function stancePlainExplain(stanceKey: string): string {
  switch (stanceKey) {
    case "long_term_hold":
      return "Desk attention leans longer-term bullish context — not a recommendation to buy.";
    case "would_hold":
      return "Desk sees more supportive than hostile context — informational, not an order to hold.";
    case "short_term_hold":
      return "Near-term attention is elevated; a watchlist cue, not a trade ticket.";
    case "wouldnt_buy":
      return "Desk context is cautious on new entries — still not advice to sell or avoid.";
    case "would_avoid":
      return "Risk flags are louder than support — awareness only, not a sell order.";
    case "sell":
      return "Desk lean is defensive on this print — educational stance, not an instruction to sell.";
    default:
      return "Mixed or balanced desk context — a starting point for your own research.";
  }
}
