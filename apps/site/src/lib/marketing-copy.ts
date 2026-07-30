export const TAGLINE = "AI Market Intelligence Platform";
export const HERO_EYEBROW = "Discover opportunities before they become obvious";
export const HERO_HEADLINE = "Stop Following The Market.";
export const HERO_HEADLINE_ACCENT = "Start Seeing What's Next.";
export const HERO_SUBHEAD =
  "MotiveFX uses AI to connect millions of market signals, identify emerging opportunities, and explain where markets are likely headed before the story becomes obvious.";

export const HERO_PROPS = [
  { icon: "ai", title: "Data Universe™", desc: "Continuously consumes news, filings, macro, and market data" },
  { icon: "signal", title: "Signal Engine™", desc: "Surfaces the few signals that actually matter" },
  { icon: "multi", title: "Relationship Engine™", desc: "Maps how events cascade across industries" },
  { icon: "action", title: "Probability Engine™", desc: "Direction, confidence, timing, and evidence" },
] as const;

/** Media outlets referenced in research briefs — not an endorsement or user count claim. */
export const TRUST_LOGOS = [
  "Yahoo Finance",
  "Benzinga",
  "MarketWatch",
  "Seeking Alpha",
  "Nasdaq",
  "Investing.com",
];

export const FEATURES = [
  {
    title: "Daily Brief",
    description: "What changed overnight, why it matters, and what to watch — prioritized.",
    icon: "brief" as const,
  },
  {
    title: "Opportunity Radar™",
    description: "Find developing situations before they become headlines.",
    icon: "why" as const,
  },
  {
    title: "Signal Engine™",
    description: "Importance, confidence, industries, timing — not 1,000 raw headlines.",
    icon: "signal" as const,
  },
  {
    title: "Cause Engine™",
    description: "Every move explained: what changed, which events mattered, what might follow.",
    icon: "markets" as const,
  },
  {
    title: "Built On Evidence",
    description: "Probability, confidence, supporting factors, and historical analogues.",
    icon: "memory" as const,
  },
  {
    title: "Multi-Market Desks",
    description: "Stocks, crypto, pink slips, sports odds, and prediction markets in one terminal.",
    icon: "everywhere" as const,
  },
];

export const CONNECTED_NODES = [
  {
    id: "rates",
    label: "Interest Rates",
    connected: ["Housing", "Banks", "Consumer Spending", "Retail", "Currency"],
  },
  {
    id: "housing",
    label: "Housing",
    connected: ["Banks", "Construction", "Lumber", "Insurance", "Retail"],
  },
  {
    id: "oil",
    label: "Oil",
    connected: ["Shipping", "Inflation", "Transportation", "Consumer Goods", "Currency"],
  },
  {
    id: "ai",
    label: "AI / Tech",
    connected: ["Semiconductors", "Energy", "Labor", "Productivity", "Markets"],
  },
] as const;

export const SIGNAL_FEED_DEMO = {
  title: "Freight costs are rising across key Pacific shipping routes.",
  effects: [
    "Consumer goods costs may increase.",
    "Retail margins could face pressure.",
    "Inflation expectations may strengthen.",
  ],
  confidence: 86,
};

export const OPPORTUNITY_RADAR_DEMO = [
  {
    theme: "Industrial automation demand strengthening",
    probability: 79,
    beneficiaries: ["Manufacturing", "Semiconductors", "Industrial software", "Automation suppliers"],
  },
  {
    theme: "Natural gas exports accelerating",
    probability: 74,
    beneficiaries: ["Energy infrastructure", "Pipeline operators", "Engineering services"],
  },
  {
    theme: "North American construction demand may accelerate",
    probability: 71,
    beneficiaries: ["Materials", "Regional banks", "Housing suppliers", "Employment"],
  },
] as const;

export const WHY_PROFESSIONALS = [
  "Detect developing market themes.",
  "Understand why events matter.",
  "Explore second- and third-order effects.",
  "Simulate potential scenarios (roadmap).",
  "Spend less time filtering noise.",
] as const;

export const EVIDENCE_PILLARS = [
  { title: "Probability", desc: "How likely the outcome is under current signals." },
  { title: "Confidence", desc: "How strongly the model trusts the evidence set." },
  { title: "Supporting factors", desc: "What is driving the view — in plain English." },
  { title: "Alternative scenarios", desc: "What could invalidate the thesis." },
  { title: "Historical comparisons", desc: "Similar setups and how they resolved." },
] as const;

export const AUDIENCE_CARDS = [
  { title: "Individual investors", desc: "Start each day with prioritized intelligence, not an endless feed." },
  { title: "Financial advisors", desc: "Explain why markets moved — with evidence clients can follow." },
  { title: "Portfolio managers", desc: "Track themes, risks, and cross-market dependencies in one desk." },
  { title: "Corporate strategy", desc: "See second-order effects across industries and supply chains." },
  { title: "Researchers", desc: "Map signals to timing, analogues, and alternative outcomes." },
  { title: "Business leaders", desc: "Understand how the world is changing before everyone else." },
] as const;

export const ECOSYSTEM = [
  { name: "Motive Corp", role: "Parent company", href: "https://www.motive-corp.com" },
  { name: "MotiveFX.AI", role: "Market Intelligence", href: "/", active: true },
  { name: "Motive Life", role: "Personal Intelligence", href: "https://www.mymotivelife.com" },
  { name: "My Motive Pulse", role: "Local business growth", href: "https://www.mymotivepulse.com" },
  { name: "Motive IQ", role: "Automotive Intelligence", href: "https://www.motiveiqs.com/gate" },
];

export const FOOTER_MARKETS = [
  { label: "Stocks", href: "/stocks" },
  { label: "Crypto", href: "/crypto" },
  { label: "Sports Betting", href: "/sports" },
  { label: "Prediction Markets", href: "/predictions" },
  { label: "Pink Sheets", href: "/pink-sheets" },
];

export const FOOTER_RESOURCES = [
  { label: "Learning center", href: "/learn" },
  { label: "Glossary", href: "/glossary" },
  { label: "Motive Signal", href: "/motive-signal" },
  { label: "Product preview", href: "/demo" },
  { label: "Daily intelligence", href: "/daily/biggest-movers" },
  { label: "Compare", href: "/compare" },
  { label: "Tools", href: "/tools" },
];

export const LANDING_FAQ_COUNT = 4;

export const FINAL_CTA_HEADLINE = "The Future Doesn't Ring A Bell.";
export const FINAL_CTA_ACCENT = "It Leaves Signals.";
export const FINAL_CTA_SUB = "See them before everyone else.";
