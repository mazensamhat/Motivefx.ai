export interface GlossaryEntry {
  id: string;
  term: string;
  category: string;
  definition: string;
  example?: string;
}

export const SIGNAL_GLOSSARY: GlossaryEntry[] = [
  {
    id: "unusual-options",
    term: "Unusual Options Flow",
    category: "Trades",
    definition:
      "Large or abnormal options volume relative to open interest — often flagged when Vol/OI exceeds typical ranges. MotiveFX surfaces it as context, not a trade instruction.",
    example: "NVDA calls with 4x average volume before earnings.",
  },
  {
    id: "sharp-money",
    term: "Sharp Money",
    category: "Betting",
    definition:
      "Wagers from professional or model-driven bettors whose action can move lines. We track sharp vs public splits as informational context.",
    example: "70% of tickets on Team A but 65% of money on Team B.",
  },
  {
    id: "line-move",
    term: "Line Movement",
    category: "Betting",
    definition:
      "How a point spread or total shifts after open. Steam moves can indicate new information or heavy one-sided action.",
  },
  {
    id: "whale-alert",
    term: "Whale Alert",
    category: "Crypto",
    definition:
      "Large on-chain transfers between wallets or exchanges. Useful volatility context — not a buy or sell signal on its own.",
  },
  {
    id: "volume-spike",
    term: "Volume Spike",
    category: "Pink Slips",
    definition:
      "Trading volume significantly above recent average on sub-$5 names. Pink Slips desk flags these for attention, not execution.",
  },
  {
    id: "congress-flow",
    term: "Congress / Insider Flow",
    category: "Trades",
    definition:
      "Disclosed purchases or sales by elected officials or insiders. Cross-referenced with options and price action for intel context.",
  },
  {
    id: "event-market",
    term: "Event Market",
    category: "Predictions",
    definition:
      "A contract priced between 0–100% yes on a future outcome (e.g. Polymarket). Implied odds are informational, not forecasts.",
  },
  {
    id: "motivfx-score",
    term: "MotiveFX Score",
    category: "Home",
    definition:
      "Aggregate signal density across desks — how much actionable intel the engine sees right now. Higher = more cross-market activity flagged. Shown on your Daily Brief.",
  },
  {
    id: "daily-brief",
    term: "Daily Brief",
    category: "Home",
    definition:
      "Your morning intelligence view: what changed, why it matters, and what to watch — with market confidence, top opportunity, and top risk. Informational only.",
  },
  {
    id: "opportunity-radar",
    term: "Opportunity Radar",
    category: "Home",
    definition:
      "Ranked developing situations across your desks. Same opportunity feed as before — framed so you research high-alignment themes before they become obvious headlines.",
  },
  {
    id: "signal-graph",
    term: "Relationship Engine / Signal Graph",
    category: "Home",
    definition:
      "Maps how macro and sector nodes cascade (e.g. rates → housing → banks). Click a node to see second- and third-order links. Educational context — not a trading graph.",
  },
  {
    id: "probability-engine",
    term: "Probability Engine",
    category: "Home",
    definition:
      "Estimates theme likelihood (probability) and how strongly the model trusts the evidence (confidence). Informational only — not a forecast of profit.",
  },
  {
    id: "consensus-break",
    term: "Consensus Break",
    category: "Home",
    definition:
      "Flags where desk signals diverge from a simple crowd narrative — a watchlist for “the story may be wrong,” not a prediction.",
  },
  {
    id: "future-simulator",
    term: "Future Simulator",
    category: "Home",
    definition:
      "Educational scenario branches (base / accelerate / fade) from a seed event. Not forecasts, price targets, or advice.",
  },
  {
    id: "market-genome",
    term: "Market Genome",
    category: "Home",
    definition:
      "Compact trait map for a radar hit — stance, risk, factors, and related Relationship Engine nodes.",
  },
  {
    id: "theme-watchlist",
    term: "Theme Watchlist",
    category: "Home",
    definition:
      "Personalized list of predictive themes (not just tickers). Suggestions come from the Probability Engine; live probability updates on each Daily Brief.",
  },
  {
    id: "predictive-alerts",
    term: "Predictive Alerts",
    category: "Home",
    definition:
      "Custom rules on evolving signals — e.g. theme probability above a threshold, Consensus Break divergence, or Genome high risk. Informational inbox alerts; push on Pro+.",
  },
  {
    id: "radar-hit",
    term: "Radar Hit",
    category: "Home",
    definition:
      "A live signal that matches a symbol on your Intel Radar or in your holdings ledger — also surfaced on Opportunity Radar when relevant.",
  },
  {
    id: "scenario",
    term: "Modeled Scenario",
    category: "General",
    definition:
      "Historical or statistical context marked with * — educational framing only. Not a prediction of future price or outcome.",
  },
];
