export const TAGLINE = "Predictive Market Intelligence";
export const BRAND_LINE = "MotiveFX";

export const HERO_EYEBROW = "Motive Signal™ · the language of what's next";
export const HERO_HEADLINE = "The Market Doesn't Move Randomly.";
export const HERO_HEADLINE_ACCENT = "AI Sees The Signals Before Everyone Else.";
export const HERO_SUBHEAD =
  "MotiveFX connects news, macro, shipping, rates, and markets into one glowing path — so you see what you should know before the story is obvious.";

/** Hero constellation nodes (floating world signals). */
export const HERO_FLOAT_SIGNALS = [
  "News",
  "Shipping",
  "Politics",
  "Weather",
  "Rates",
  "Oil",
  "Labor",
  "AI CapEx",
] as const;

/** Final glowing path shown after connections form. */
export const HERO_SIGNAL_PATH = [
  "Copper",
  "Construction",
  "Housing",
  "Banks",
  "Retail",
] as const;

export const WORLD_INTEL_THEMES = [
  {
    theme: "Semiconductors",
    status: "↑ Confidence increasing",
    tone: "up" as const,
  },
  {
    theme: "Global Shipping",
    status: "↓ Demand weakening",
    tone: "down" as const,
  },
  {
    theme: "Energy",
    status: "Signal strength 87",
    tone: "signal" as const,
  },
  {
    theme: "Consumer Spending",
    status: "Momentum rising",
    tone: "up" as const,
  },
  {
    theme: "Housing",
    status: "Turning point detected",
    tone: "turn" as const,
  },
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
    title: "Motive Signal™",
    description:
      "Your brand language for confluence — ask “What’s the Motive Signal on this theme?” the way desks ask for VIX.",
    icon: "signal" as const,
  },
  {
    title: "Opportunity Radar™",
    description: "Developing situations ranked by probability, evidence, and who stands to benefit.",
    icon: "why" as const,
  },
  {
    title: "Relationship Graph™",
    description: "Click Oil — watch shipping, inflation, freight, and retail light up.",
    icon: "markets" as const,
  },
  {
    title: "Market DNA™",
    description: "Every asset gets a personality: what lifts it, what breaks it, what usually comes next.",
    icon: "memory" as const,
  },
  {
    title: "Daily Brief",
    description: "What changed overnight, why it matters, and what to watch — prioritized.",
    icon: "brief" as const,
  },
  {
    title: "Evidence Stack",
    description: "Probability, confidence, supporting factors, analogues — not vibes.",
    icon: "everywhere" as const,
  },
];

export const CONNECTED_NODES = [
  {
    id: "oil",
    label: "Oil",
    connected: [
      "Shipping",
      "Construction",
      "Housing",
      "Retail",
      "Currencies",
      "Energy",
      "Automotive",
      "Inflation",
    ],
  },
  {
    id: "rates",
    label: "Interest Rates",
    connected: ["Housing", "Banks", "Consumer Spending", "Retail", "Currencies", "Equities"],
  },
  {
    id: "housing",
    label: "Housing",
    connected: ["Banks", "Construction", "Lumber", "Insurance", "Retail", "Employment"],
  },
  {
    id: "ai",
    label: "AI CapEx",
    connected: ["Semiconductors", "Energy", "Cloud", "Labor", "Productivity", "Markets"],
  },
  {
    id: "shipping",
    label: "Shipping",
    connected: ["Retail", "Inflation", "Commodities", "Manufacturing", "Freight"],
  },
] as const;

/** Default Today's Signals rows (marketing + terminal fallback). */
export const TODAYS_SIGNALS_DEMO = [
  { id: "housing", label: "Housing Momentum", status: "↑ Rising", tone: "up" as const, icon: "home" as const },
  { id: "ai", label: "AI Infrastructure", status: "↑ Accelerating", tone: "up" as const, icon: "cpu" as const },
  { id: "inflation", label: "Inflation", status: "↓ Cooling", tone: "cool" as const, icon: "chart" as const },
  { id: "china", label: "Chinese Demand", status: "↑ Improving", tone: "up" as const, icon: "globe" as const },
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
    confidence: 82,
    horizon: "30–90 days",
    evidence: ["CapEx filings rising", "Order backlog proxies", "Semiconductor lead times"],
    analogue: "2017–18 industrial robotics cycle",
    beneficiaries: ["Manufacturing", "Semiconductors", "Industrial software", "Automation suppliers"],
  },
  {
    theme: "Natural gas exports accelerating",
    probability: 74,
    confidence: 77,
    horizon: "60–180 days",
    evidence: ["Export capacity adds", "Spread vs EU benchmarks", "Infrastructure spend"],
    analogue: "2021 LNG export ramp",
    beneficiaries: ["Energy infrastructure", "Pipeline operators", "Engineering services"],
  },
  {
    theme: "North American construction demand may accelerate",
    probability: 71,
    confidence: 69,
    horizon: "90–180 days",
    evidence: ["Permit momentum", "Materials pricing", "Regional bank exposure"],
    analogue: "Post-rate-pause housing recoveries",
    beneficiaries: ["Materials", "Regional banks", "Housing suppliers", "Employment"],
  },
] as const;

export const ASK_BETTER_QUESTIONS = [
  "Can interest rates hurt Tesla before earnings?",
  "How will Canadian housing affect lumber demand?",
  "What happens if oil reaches $100?",
  "Who benefits from AI infrastructure spending?",
  "What industries win if inflation falls?",
  "Which companies are quietly becoming stronger?",
] as const;

export const MARKET_DNA_DEMO = {
  asset: "NVIDIA",
  positive: ["AI spending", "Semiconductor shortages", "Cloud expansion", "Enterprise CapEx"],
  negative: ["Export restrictions", "Supply chain disruptions", "Government intervention", "Rate shocks"],
};

export const USE_CASES = [
  { title: "Stocks & themes", desc: "See second-order winners before the ticker story breaks." },
  { title: "Crypto & liquidity", desc: "Map macro and flow into crypto regimes — not chart noise." },
  { title: "Supply chain", desc: "Freight, commodities, and manufacturing in one graph." },
  { title: "Commodities & energy", desc: "Oil, gas, metals — and what they light up next." },
  { title: "Currencies & macro", desc: "Rates and FX as connected pressure — not isolated prints." },
  { title: "Prediction markets", desc: "Odds as another signal layer in the same intelligence stack." },
  { title: "Corporate strategy", desc: "Scenario paths for planning, not day-trading screens." },
  { title: "Insurance & risk", desc: "Theme exposure and cascade risk for underwriting desks." },
] as const;

export const WHY_PROFESSIONALS = [
  "Detect developing market themes.",
  "Understand why events matter.",
  "Explore second- and third-order effects.",
  "Simulate potential scenarios.",
  "Speak in Motive Signal — not raw feeds.",
] as const;

export const EVIDENCE_PILLARS = [
  { title: "Probability", desc: "How likely the outcome is under current signals." },
  { title: "Confidence", desc: "How strongly the model trusts the evidence set." },
  { title: "Supporting factors", desc: "What is driving the view — in plain English." },
  { title: "Alternative scenarios", desc: "What could invalidate the thesis." },
  { title: "Historical comparisons", desc: "Similar setups and how they resolved." },
] as const;

export const AUDIENCE_CARDS = [
  { title: "Investors", desc: "Start with what you should know — not another research tab." },
  { title: "Advisors", desc: "Explain cascades with evidence clients can follow." },
  { title: "Portfolio managers", desc: "Theme risk and cross-market dependency in one desk." },
  { title: "Corporate strategy", desc: "Second-order effects across industries and supply chains." },
  { title: "Researchers", desc: "Signals → timing → analogues → alternatives." },
  { title: "Operators", desc: "See how the world is changing before everyone else." },
] as const;

export const ECOSYSTEM = [
  { name: "Motive Corp", role: "Parent company", href: "https://www.motive-corp.com" },
  { name: "MotiveFX.AI", role: "Predictive Market Intelligence", href: "/", active: true },
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
  { label: "Opportunity Radar", href: "/opportunity-radar" },
  { label: "Methods & limitations", href: "/limitations" },
  { label: "Product preview", href: "/demo" },
  { label: "Daily intelligence", href: "/daily/biggest-movers" },
  { label: "Compare", href: "/compare" },
  { label: "Tools", href: "/tools" },
];

export const LANDING_FAQ_COUNT = 4;

export const FINAL_CTA_HEADLINE = "The Future Doesn't Ring A Bell.";
export const FINAL_CTA_ACCENT = "It Leaves Signals.";
export const FINAL_CTA_SUB = "See them first.";

export const CATEGORY_ONE_LINER =
  "The platform that predicts where markets are going by connecting signals before everyone else sees them.";
