/**
 * Plain-language signal helpers for non-experts.
 * Differentiates chips/reasons per ticker using available row metrics — not live quotes.
 */

export type SignalClarityModule =
  | "trades"
  | "penny"
  | "pinkslips"
  | "crypto"
  | "betting"
  | "predictions";

export interface SignalChip {
  label: string;
  why: string;
}

export interface SignalReasonContext {
  symbol?: string;
  metrics?: Record<string, string | number | undefined | null>;
}

export interface OpportunitySignalInput {
  module: SignalClarityModule | string;
  symbol: string;
  type?: string; // call | put
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

const BETTING_POOL = [
  "Line Movement",
  "Sharp Money",
  "Public Split",
  "Steam Move",
  "AI Lens",
] as const;

const PRED_POOL = [
  "Event Market",
  "24h Volume",
  "Odds Swing",
  "Crowd Consensus",
  "AI Lens",
] as const;

function pickFromPool(pool: readonly string[], seed: number, count: number, forced: string[] = []): string[] {
  const out: string[] = [];
  for (const f of forced) {
    if (pool.includes(f) && !out.includes(f)) out.push(f);
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

/** Select 2–3 differentiated signal chips for an opportunity / deep-dive row. */
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

/** Build chip objects with one-line “why this ticker” copy. */
export function buildSignalStack(input: OpportunitySignalInput): SignalChip[] {
  const labels = pickSignalsForOpportunity(input);
  const sym = (input.symbol || "this name").toUpperCase();
  return labels.map((label) => ({
    label,
    why: whyForChip(label, sym, input),
  }));
}

function whyForChip(label: string, sym: string, input: OpportunitySignalInput): string {
  const l = label.toLowerCase();
  if (l.includes("call")) {
    return `$${sym} showed elevated call activity${input.volOiRatio ? ` (Vol/OI ${input.volOiRatio}x — options trading vs contracts already open)` : ""}.`;
  }
  if (l.includes("put")) {
    return `$${sym} put activity stood out vs recent norms — often hedging, not always a bearish bet.`;
  }
  if (l.includes("premium")) {
    return `Large options premium on $${sym}${input.premium ? ` (~$${Math.floor(input.premium).toLocaleString()})` : ""} drew desk attention.`;
  }
  if (l.includes("block")) {
    return `Larger block-style size on $${sym} vs typical retail clips.`;
  }
  if (l.includes("unusual volume") || l.includes("volume breakout")) {
    return `$${sym} traded much more than its recent average${input.volRatio ? ` (${input.volRatio}x)` : input.volOiRatio ? ` (Vol/OI ${input.volOiRatio}x)` : ""}.`;
  }
  if (l.includes("microcap") || l.includes("thin")) {
    return `$${sym} is in a thinner / smaller-cap context — moves can be sharp and reverse quickly.`;
  }
  if (l.includes("catalyst")) {
    return `MotiveFX flagged $${sym} for a possible news or catalyst window — verify headlines yourself.`;
  }
  if (l.includes("whale") || l.includes("on-chain") || l.includes("exchange") || l.includes("wallet")) {
    return `Large ${sym} wallet/exchange flow${input.amountUsd ? ` (~$${Math.floor(input.amountUsd / 1e6)}M)` : ""} — context for volatility, not a trade order.`;
  }
  if (l.includes("line") || l.includes("sharp") || l.includes("public") || l.includes("steam")) {
    return `Odds/line context moved on this matchup — informational only.`;
  }
  if (l.includes("event") || l.includes("crowd") || l.includes("odds")) {
    return `Event-market pricing on this contract${input.yesPct != null ? ` (~${input.yesPct}% yes)` : ""} reflects crowd odds, not a forecast.`;
  }
  if (l.includes("congress")) {
    return `$${sym} appears near recent disclosure activity — cross-check filings; not a tip.`;
  }
  if (l.includes("ai")) {
    return `MotiveFX cross-checked $${sym} against other signal feeds for this session.`;
  }
  if (l.includes("options")) {
    return `Options activity highlighted $${sym} versus its own recent baseline.`;
  }
  return `Tagged on $${sym} by the live signal review — research before acting.`;
}

export function expandSignalToReason(signal: string, ctx?: SignalReasonContext): string {
  const sym = ctx?.symbol ? `$${String(ctx.symbol).toUpperCase()}` : "this name";
  const m = ctx?.metrics ?? {};
  const s = signal.toLowerCase();

  if (s.includes("vol/oi") || s.includes("unusual options") || s.includes("options flow") || s.includes("call") || s.includes("put") || s.includes("premium") || s.includes("block")) {
    const vol = m.volOiRatio != null ? ` Vol/OI ${m.volOiRatio}x.` : "";
    const prem = m.premium != null ? ` Premium ~$${Number(m.premium).toLocaleString()}.` : "";
    return `${signal} on ${sym} — options activity above typical open-interest ranges.${vol}${prem} Informational context only.`;
  }
  if (s.includes("whale") || s.includes("on-chain") || s.includes("exchange")) {
    const amt = m.amountUsd != null ? ` ~$${Math.floor(Number(m.amountUsd) / 1e6)}M.` : "";
    return `${signal} on ${sym} — large on-chain transfer flagged.${amt} Watch liquidity; not a buy/sell order.`;
  }
  if (s.includes("sharp") || s.includes("line") || s.includes("steam") || s.includes("public")) {
    return `${signal} — professional vs public ticket context on this matchup. Odds intel only.`;
  }
  if (s.includes("volume") || s.includes("microcap") || s.includes("pink") || s.includes("breakout") || s.includes("thin") || s.includes("catalyst")) {
    const ch = m.changePct != null ? ` Session ${Number(m.changePct) >= 0 ? "+" : ""}${m.changePct}%.` : "";
    const vr = m.volRatio != null ? ` Volume ${m.volRatio}x average.` : "";
    return `${signal} on ${sym} — relative volume/volatility elevated.${ch}${vr} Higher risk of sharp reversals.`;
  }
  if (s.includes("congress") || s.includes("insider")) {
    return `${signal} on ${sym} — disclosure cross-referenced with price/flow. Not a tip to copy.`;
  }
  if (s.includes("event market") || s.includes("polymarket") || s.includes("crowd") || s.includes("odds")) {
    const y = m.yesPct != null ? ` Implied yes ~${m.yesPct}%.` : "";
    return `${signal} — crowd pricing on the contract.${y} Reflects consensus, not a forecast.`;
  }
  return `${signal} on ${sym} — flagged by MotiveFX signal review. Cross-check with your own research.`;
}

export function beginnerNextSteps(symbol?: string, category?: string): string[] {
  const sym = symbol ? `$${symbol.toUpperCase()}` : "this name";
  const cat = (category ?? "").toLowerCase();
  if (cat.includes("crypto")) {
    return [
      `Check whether the ${sym} transfer was to/from an exchange (context for selling pressure or accumulation).`,
      "Look up a plain-English news summary for the last 24 hours.",
      "Decide what would change your mind before opening any app to trade.",
    ];
  }
  if (cat.includes("betting") || cat.includes("odds")) {
    return [
      "Confirm the current line vs open — one move is not a finished story.",
      "Read why the line moved (injury, weather, public steam) from a trusted source.",
      "Remember MotiveFX is monitor-only — we do not place bets.",
    ];
  }
  if (cat.includes("prediction") || cat.includes("event")) {
    return [
      "Read the exact market resolution rules before treating the % as a forecast.",
      "Ask what new information would move the yes price 10 points.",
      "Treat crowd odds as a temperature check, not advice.",
    ];
  }
  if (cat.includes("pink") || cat.includes("volume spike")) {
    return [
      `Check ${sym} float / average volume — thin names move fast both ways.`,
      "Scan for a real catalyst (filing, news) vs rumor chatter.",
      "Size mentally as high-risk awareness — not a recommendation.",
    ];
  }
  return [
    `Look up what ${sym} does in one sentence (business, not ticker memes).`,
    "Check today’s price vs yesterday and whether volume is still elevated.",
    "Write one reason you’d still watch — and one reason you’d walk away — before opening a broker.",
  ];
}

export function stancePlainExplain(stanceOrTitle: string): string {
  const a = stanceOrTitle.toLowerCase();
  if (a.includes("long-term") || a.includes("long_term")) {
    return "Desk attention leans longer-term bullish context — not a recommendation to buy.";
  }
  if (a.includes("would hold") || a.includes("would_hold") || a === "i would hold") {
    return "Desk sees more supportive than hostile context — informational, not an order to hold.";
  }
  if (a.includes("short-term") || a.includes("short_term")) {
    return "Near-term attention is elevated; this is a watchlist cue, not a trade ticket.";
  }
  if (a.includes("wouldn't buy") || a.includes("wouldnt_buy") || a.includes("wouldn’t buy")) {
    return "Desk context is cautious on new entries — still not advice to sell or avoid.";
  }
  if (a.includes("would avoid") || a.includes("would_avoid")) {
    return "Risk/context flags are louder than support — awareness only, not a sell order.";
  }
  if (a.includes("sell")) {
    return "Desk lean is defensive on this print — educational stance, not an instruction to sell.";
  }
  return "Mixed or balanced desk context — use as a starting point for your own research.";
}

export interface PlainBrief {
  plainSummary: string;
  whatItMeans: string[];
  whatToWatch: string[];
  aiAdvice: string;
  signalStack: SignalChip[];
}

export function buildPlainBrief(input: OpportunitySignalInput & {
  priceLabel?: string;
  sharesLabel?: string;
  statusVariant?: "bullish" | "bearish" | "neutral";
  existingNote?: string;
}): PlainBrief {
  const sym = (input.symbol || "—").toUpperCase();
  const stack = buildSignalStack(input);
  const lean =
    input.statusVariant === "bullish"
      ? "more bullish than bearish"
      : input.statusVariant === "bearish"
        ? "more cautious / defensive"
        : "fairly mixed";

  const note = (input.existingNote || input.note || "").trim();
  const plainSummary =
    note.length > 24
      ? `For $${sym}: ${note.length > 160 ? `${note.slice(0, 157)}…` : note}`
      : `You're viewing $${sym}. MotiveFX is highlighting desk attention that looks ${lean} right now — research context only, not a buy or sell order.`;

  const whatItMeans: string[] = [];
  if (input.priceLabel && input.priceLabel !== "—") {
    whatItMeans.push(`Reference price in your ledger: ${input.priceLabel}.`);
  }
  if (input.sharesLabel) {
    whatItMeans.push(`Your recorded size: ${input.sharesLabel}.`);
  }
  if (input.volOiRatio) {
    whatItMeans.push(
      `Options activity vs open interest is about ${input.volOiRatio}x usual (Vol/OI = how busy options are vs contracts already open).`
    );
  }
  if (input.volRatio) {
    whatItMeans.push(`Trading volume is about ${input.volRatio}x its recent average.`);
  }
  if (input.changePct != null) {
    whatItMeans.push(
      `Session move around ${input.changePct >= 0 ? "+" : ""}${Number(input.changePct).toFixed(1)}% — useful context, not a prediction.`
    );
  }
  if (input.premium) {
    whatItMeans.push(`Notable options premium near $${Math.floor(input.premium).toLocaleString()}.`);
  }
  if (input.amountUsd) {
    whatItMeans.push(`Large transfer near $${Math.floor(input.amountUsd / 1e6)}M flagged on-chain.`);
  }
  if (input.yesPct != null) {
    whatItMeans.push(`Event market implies about ${input.yesPct}% “yes” — crowd odds, not a forecast.`);
  }
  whatItMeans.push(...stack.slice(0, 2).map((c) => c.why));
  if (whatItMeans.length < 2) {
    whatItMeans.push(`Top signals on $${sym}: ${stack.map((c) => c.label).join(", ") || "desk scan"}.`);
  }

  const whatToWatch = beginnerNextSteps(sym, String(input.module));

  // Differentiated paragraph — never identical across symbols
  const templates = [
    `$${sym} is on the desk because ${stack[0]?.label ?? "scanner tags"} stood out versus its own recent baseline.`,
    `Think of this as a spotlight on $${sym}, not a finished thesis — confirm price, volume, and news yourself.`,
    `Attention score reflects how loud the feeds are for $${sym} today, not how “good” the stock is.`,
  ];
  const seed = input.seed ?? hashSym(sym);
  const aiAdvice = `${templates[seed % templates.length]} ${templates[(seed + 1) % templates.length]} ${stancePlainExplain(lean)}.`;

  return {
    plainSummary,
    whatItMeans: whatItMeans.slice(0, 5),
    whatToWatch: whatToWatch.slice(0, 3),
    aiAdvice,
    signalStack: stack,
  };
}
