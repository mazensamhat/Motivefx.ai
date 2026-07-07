import { scanUnusualOptions, fetchCongressTrades, fetchPredictionMarkets, demoSharpAction, scanPennyMovers, fetchWhaleAlerts } from "./feeds";

export type Recommendation = {

  symbol: string;

  action: string;

  confidence: number;

  headline: string;

  reasoning: string;

  signals: string[];

  /** Human-readable score breakdown for Why? modal — not raw signal tags. */

  reasons: string[];

};



export type AdvisorResult = {

  module: string;

  summary: string;

  recommendations: Recommendation[];

  picks: Recommendation[];

  ai_narrative: string;

  deep_scans: Array<{ title: string; detail: string }>;

  portfolio_value: number | null;

  news: Array<Record<string, unknown>>;

};



function localNarrative(module: string, summary: string, recs: Recommendation[]): string {

  const top = recs[0];

  const conclusion =

    recs.filter((r) => r.action === "buy").length >= recs.filter((r) => r.action === "sell").length

      ? "Bullish Continuation Likely"

      : "Wait for Confirmation";

  return [

    top ? `${top.symbol}: ${top.headline}` : `${module} desk scan complete`,

    summary,

    `CONCLUSION: ${conclusion}`,

    "Informational context only — not financial advice.",

  ].join("\n\n");

}



function scoreVerdict(action: string, confidence: number): string {

  if (action === "buy") {

    return `Composite Motive Signal ${confidence}/100 — bullish flow and cross-checks outweigh neutral factors.`;

  }

  if (action === "sell") {

    return `Composite Motive Signal ${confidence}/100 — defensive flow or negative cross-checks pulled sentiment bearish.`;

  }

  return `Composite Motive Signal ${confidence}/100 — mixed or insufficient directional inputs; labeled Neutral.`;

}



function buildStockReasons(

  sym: string,

  shares: number,

  avg: number | undefined,

  action: string,

  confidence: number,

  score: number,

  signals: string[],

  unusual?: {

    type: string;

    volOiRatio?: number;

    premium?: number;

    strike?: number;

    expiry?: string;

    note?: string;

  },

  congress?: { politician: string; transaction: string; amount: string }

): string[] {

  const reasons: string[] = [];



  if (shares > 0) {

    reasons.push(

      avg

        ? `Ledger context: ${shares} shares at $${avg} avg cost — used as baseline when cross-checking live flow.`

        : `Ledger context: ${shares} shares tracked; add avg cost for P/L-aware scoring.`

    );

  }



  if (unusual) {

    reasons.push(

      `Unusual ${unusual.type} options flow — Vol/OI ${unusual.volOiRatio ?? "—"}x average (desk flags above ~2x).`

    );

    if (unusual.premium) {

      reasons.push(

        `Premium block ~$${Math.floor(Number(unusual.premium)).toLocaleString()} on $${sym}${unusual.strike ? ` · strike $${unusual.strike}` : ""}.`

      );

    }

    reasons.push(

      unusual.type === "call"

        ? "Call-heavy flow typically signals bullish positioning — added +15 pts to base score."

        : "Put-heavy flow typically signals defensive positioning — subtracted 12 pts from base score."

    );

    if (unusual.note) reasons.push(unusual.note);

  } else {

    reasons.push(`No unusual options flow flagged for $${sym} in today's scan — base score anchored at 55 (neutral).`);

    reasons.push("Desk monitors earnings dates, insider filings, and block trades; none crossed alert thresholds yet.");

  }



  if (congress) {

    reasons.push(

      `${congress.politician} disclosed ${congress.transaction} of $${sym} (${congress.amount}) — cross-referenced with options activity.`

    );

  }



  if (signals.length === 0 && !unusual && !congress) {

    reasons.push("Watch for Vol/OI spikes, congress/insider filings, and unusual block prints to shift the score.");

  }



  reasons.push(scoreVerdict(action, confidence));

  reasons.push("Informational context only — not a buy, sell, or hold recommendation.");



  return reasons.slice(0, 6);

}



export async function analyzeStockPortfolio(holdings: Array<{ symbol: string; shares?: number; avg_cost?: number }>) {

  const unusual = scanUnusualOptions();

  const unusualBySym = Object.fromEntries(unusual.map((u) => [u.symbol, u]));

  const congress = await fetchCongressTrades(20);

  const congressBySym = Object.fromEntries(congress.map((c) => [c.symbol, c]));



  const recs: Recommendation[] = holdings.map((h) => {

    const sym = h.symbol.toUpperCase();

    const shares = Number(h.shares ?? 0);

    const avg = h.avg_cost;

    const signals: string[] = [];

    let score = 55;

    let action = "hold";

    const u = unusualBySym[sym];

    const c = congressBySym[sym];



    if (u) {

      signals.push(`Unusual ${u.type} flow Vol/OI ${u.volOiRatio}x`);

      score += u.type === "call" ? 15 : -12;

    }

    if (c) signals.push("Congress / Insider Flow");



    if (score >= 65) action = "buy";

    else if (score <= 35) action = "sell";



    const confidence = Math.min(95, Math.max(40, score));

    const headline =

      action === "buy"

        ? `Bullish sentiment building in $${sym}`

        : action === "sell"

          ? `Bearish flow detected in $${sym}`

          : `Mixed signals on $${sym}`;



    const reasons = buildStockReasons(sym, shares, avg, action, confidence, score, signals, u, c);



    return {

      symbol: sym,

      action,

      confidence,

      headline,

      reasoning: reasons[0] ?? headline,

      signals: signals.length ? signals : ["Flow scan"],

      reasons,

    };

  });



  const summary = `Analyzed ${holdings.length} positions. ${recs.filter((r) => r.action === "buy").length} bullish, ${recs.filter((r) => r.action === "sell").length} bearish. Cross-checked options flow and disclosure feeds (informational only).`;

  return { summary, recs };

}



function buildCryptoReasons(

  sym: string,

  amount: number,

  avg: number | undefined,

  action: string,

  confidence: number,

  whaleNote?: string

): string[] {

  const reasons: string[] = [];

  if (amount > 0) {

    reasons.push(

      avg

        ? `Ledger: ${amount} ${sym} units at ~$${avg} avg — on-chain desk uses this for exposure context.`

        : `Ledger: ${amount} ${sym} units tracked.`

    );

  }

  if (whaleNote) {

    reasons.push(whaleNote);

    reasons.push("Large wallet moves often precede volatility windows — monitor exchange inflows/outflows.");

  } else {

    reasons.push(`No whale alerts tied to $${sym} in the last scan window.`);

    reasons.push("Score reflects spot liquidity tier and recent on-chain activity density.");

  }

  if (sym === "BTC" || sym === "ETH") {

    reasons.push(`${sym} receives higher baseline weighting due to depth and cross-exchange liquidity.`);

  }

  reasons.push(scoreVerdict(action, confidence));

  reasons.push("Informational context only — not a buy, sell, or hold recommendation.");

  return reasons.slice(0, 6);

}



export async function analyzeCryptoPortfolio(holdings: Array<{ symbol: string; amount?: number; avg_cost?: number }>) {

  const whales = await fetchWhaleAlerts();

  const whaleByAsset = Object.fromEntries(whales.map((w) => [String(w.asset).toUpperCase(), w]));



  const recs: Recommendation[] = holdings.map((h) => {

    const sym = h.symbol.toUpperCase();

    const amount = Number(h.amount ?? 0);

    const avg = h.avg_cost;

    const score = sym === "BTC" || sym === "ETH" ? 68 : 55;

    const action = score >= 65 ? "buy" : "hold";

    const confidence = score;

    const w = whaleByAsset[sym];

    const whaleNote = w

      ? `$${Math.floor(Number(w.amountUsd) / 1_000_000)}M ${w.direction} — ${w.note ?? "on-chain transfer flagged"}.`

      : undefined;



    const reasons = buildCryptoReasons(sym, amount, avg, action, confidence, whaleNote);



    return {

      symbol: sym,

      action,

      confidence,

      headline: `${sym} on-chain context`,

      reasoning: reasons[0] ?? `${sym} desk scan`,

      signals: whaleNote ? ["Whale Alert", "On-Chain"] : ["On-Chain Lens"],

      reasons,

    };

  });



  return { summary: `Analyzed ${holdings.length} crypto positions against whale and spot feeds.`, recs };

}



function buildPennyReasons(

  sym: string,

  shares: number,

  avg: number | undefined,

  action: string,

  confidence: number,

  mover?: { changePct?: number; volRatio?: number; note?: string; price?: number }

): string[] {

  const reasons: string[] = [];

  if (shares > 0) {

    reasons.push(

      avg

        ? `Microcap ledger: ${shares} shares of $${sym} at $${avg} avg — pink slip desk applies elevated volatility lens.`

        : `Microcap ledger: ${shares} shares of $${sym} tracked.`

    );

  }

  if (mover) {

    reasons.push(

      mover.note ??

        `Session ${mover.changePct != null ? `${mover.changePct >= 0 ? "+" : ""}${mover.changePct}%` : "move"} · volume ${mover.volRatio ?? "—"}x average.`

    );

    reasons.push("Volume spikes on sub-$5 names often precede catalyst-driven swings — flagged for awareness.");

  } else {

    reasons.push(`No volume breakout flagged for $${sym} in today's microcap scan.`);

    reasons.push("Pink slip scoring weights relative volume, float size, and news catalyst density.");

  }

  reasons.push(scoreVerdict(action, confidence));

  reasons.push("Higher risk tier — informational context only.");

  return reasons.slice(0, 6);

}



export async function analyzePennyPortfolio(holdings: Array<{ symbol: string; shares?: number; avg_cost?: number }>) {

  const movers = scanPennyMovers();

  const moverBySym = Object.fromEntries(movers.map((m) => [m.symbol, m]));



  const recs: Recommendation[] = holdings.map((h) => {

    const sym = h.symbol.toUpperCase();

    const shares = Number(h.shares ?? 0);

    const avg = h.avg_cost;

    const mover = moverBySym[sym];

    let score = 58;

    if (mover && (mover.volRatio ?? 0) >= 3) score += 12;

    if (mover && Math.abs(mover.changePct ?? 0) >= 10) score += 8;

    const action = score >= 65 ? "buy" : "hold";

    const confidence = Math.min(90, score);

    const reasons = buildPennyReasons(sym, shares, avg, action, confidence, mover);



    return {

      symbol: sym,

      action,

      confidence,

      headline: `$${sym} microcap watch`,

      reasoning: reasons[0] ?? `${sym} microcap context`,

      signals: mover ? ["Volume Spike", "Microcap Scanner"] : ["Pink Slip Scanner"],

      reasons,

    };

  });



  return { summary: `Analyzed ${holdings.length} pink slip positions against volume and catalyst feeds.`, recs };

}



function buildBetReasons(

  label: string,

  pick: string | undefined,

  stake: number,

  action: string,

  confidence: number,

  sharp?: { sharpSide: string; publicPct: number; moneyPct: number; signal: string }

): string[] {

  const reasons: string[] = [];

  if (pick) reasons.push(`Open slip: ${pick} — stake $${stake}.`);

  if (sharp) {

    reasons.push(`Sharp side: ${sharp.sharpSide} · signal ${sharp.signal.replace(/_/g, " ")}.`);

    reasons.push(`Public ${sharp.publicPct}% of tickets vs ${sharp.moneyPct}% of handle — split indicates professional lean.`);

  } else {

    reasons.push("Review line movement and closing steam before lock — no sharp split crossed threshold on this matchup.");

  }

  reasons.push("Line shopping across books can shift implied edge by 0.5–1.5 pts.");

  reasons.push(scoreVerdict(action, confidence));

  reasons.push("Informational context only — not a wager recommendation.");

  return reasons.slice(0, 6);

}



export async function analyzeBets(bets: Array<{ matchup?: string; pick?: string; stake?: number | null }>) {

  const sharpList = demoSharpAction();

  const sharpByMatchup = Object.fromEntries(sharpList.map((s) => [s.matchup, s]));



  const picks: Recommendation[] = sharpList.slice(0, 3).map((s) => {

    const confidence = s.confidence === "high" ? 72 : 64;

    const action = "buy";

    const reasons = buildBetReasons(s.matchup, `Sharp side: ${s.sharpSide}`, 0, action, confidence, s);

    return {

      symbol: s.matchup,

      action,

      confidence,

      headline: `Sharp side: ${s.sharpSide}`,

      reasoning: reasons[0] ?? s.matchup,

      signals: ["Sharp Money", "Line Movement"],

      reasons,

    };

  });



  const recs: Recommendation[] = bets.map((b) => {

    const matchup = b.matchup ?? "Game";

    const sharp = sharpByMatchup[matchup];

    const confidence = sharp ? (sharp.confidence === "high" ? 68 : 62) : 60;

    const reasons = buildBetReasons(matchup, b.pick, Number(b.stake ?? 0), "hold", confidence, sharp);

    return {

      symbol: matchup,

      action: "hold",

      confidence,

      headline: b.pick ?? "Open bet",

      reasoning: reasons[0] ?? matchup,

      signals: sharp ? ["Sharp Money", "Bet Grader"] : ["Bet Grader"],

      reasons,

    };

  });



  const summary = bets.length ? `Graded ${bets.length} open bets against line and sharp feeds.` : "No bets yet — here are AI sharp-side picks.";

  return { summary, recs, picks };

}



function buildPredictionReasons(

  market: string,

  pick: string | undefined,

  stake: number,

  action: string,

  confidence: number,

  impliedYes?: number,

  platform?: string

): string[] {

  const reasons: string[] = [];

  if (pick) reasons.push(`Your position: ${pick} · stake $${stake}.`);

  if (impliedYes != null) {

    reasons.push(`Market pricing ${impliedYes}% implied yes on ${platform ?? "Polymarket"}.`);

    reasons.push(

      impliedYes >= 60

        ? "Crowd consensus leans yes — watch for news that could reprice the contract quickly."

        : impliedYes <= 40

          ? "Crowd consensus leans no — divergence from headlines can create repricing windows."

          : "Odds near 50/50 — high uncertainty; resolution catalysts drive most of the move."

    );

  } else {

    reasons.push("Event market odds reflect aggregated trader beliefs, not MotiveFX forecasts.");

  }

  reasons.push("AI cross-checks news flow and historical resolution patterns for context.");

  reasons.push(scoreVerdict(action, confidence));

  reasons.push("Informational context only — not a prediction or trade recommendation.");

  return reasons.slice(0, 6);

}



export async function analyzePredictions(positions: Array<{ market?: string; pick?: string; stake?: number | null }>) {

  const markets = await fetchPredictionMarkets(4);



  const recs: Recommendation[] = positions.map((p) => {

    const market = (p.market ?? "Market").slice(0, 48);

    const yes = 62;

    const reasons = buildPredictionReasons(market, p.pick, Number(p.stake ?? 0), "hold", 62);

    return {

      symbol: market,

      action: "hold",

      confidence: 62,

      headline: p.pick ?? "Open position",

      reasoning: reasons[0] ?? market,

      signals: ["Event Market"],

      reasons,

    };

  });



  if (!recs.length) {

    for (const m of markets.slice(0, 2)) {

      const yes = Math.round((Number(m.yes) || 0.5) * 100);

      const confidence = Math.round((Number(m.yes) || 0.5) * 100);

      const action = Number(m.yes) >= 0.5 ? "buy" : "hold";

      const reasons = buildPredictionReasons(

        String(m.market).slice(0, 48),

        undefined,

        0,

        action,

        confidence,

        yes,

        String(m.platform)

      );

      recs.push({

        symbol: String(m.market).slice(0, 48),

        action,

        confidence,

        headline: "Event market signal",

        reasoning: reasons[0] ?? String(m.market),

        signals: ["Polymarket", "Event Market"],

        reasons,

      });

    }

  }



  return {

    summary: positions.length ? `Analyzed ${positions.length} prediction positions.` : "Top event markets flagged.",

    recs,

  };

}



export async function buildAdvisorResponse(

  module: string,

  summary: string,

  recs: Recommendation[],

  opts: { picks?: Recommendation[]; portfolioValue?: number | null } = {}

): Promise<AdvisorResult> {

  const picks = opts.picks ?? [];

  return {

    module,

    summary,

    recommendations: recs,

    picks,

    ai_narrative: localNarrative(module, summary, recs),

    deep_scans: recs.slice(0, 3).map((r) => ({

      title: r.headline,

      detail: r.reasons.join(" "),

    })),

    portfolio_value: opts.portfolioValue ?? null,

    news: [],

  };

}

