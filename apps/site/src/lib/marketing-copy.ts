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

/**
 * Hub → satellite link copy used by Signal Graph™ (weight drives hot spoke).
 * Keys: `${hubLabel}|${satelliteLabel}` (case-sensitive labels from CONNECTED_NODES).
 */
export const SIGNAL_LINK_META: Record<
  string,
  { relation: string; blurb: string; weight: number }
> = {
  "Oil|Shipping": {
    relation: "freight costs",
    blurb: "Bunker fuel lifts ocean route rates",
    weight: 0.8,
  },
  "Oil|Construction": {
    relation: "input costs",
    blurb: "Diesel & asphalt squeeze project margins",
    weight: 0.72,
  },
  "Oil|Housing": {
    relation: "materials & commute",
    blurb: "Energy costs feed builder and buyer pressure",
    weight: 0.68,
  },
  "Oil|Retail": {
    relation: "margin squeeze",
    blurb: "Transport and packaging lift shelf prices",
    weight: 0.7,
  },
  "Oil|Currencies": {
    relation: "petrodollar flow",
    blurb: "Crude shocks reprice USD & commodity FX",
    weight: 0.76,
  },
  "Oil|Energy": {
    relation: "direct pass-through",
    blurb: "Crude sets power and refined product prices",
    weight: 0.86,
  },
  "Oil|Automotive": {
    relation: "fuel demand",
    blurb: "Pump prices reshape driving and EV timing",
    weight: 0.74,
  },
  "Oil|Inflation": {
    relation: "cost pressure",
    blurb: "Energy feeds headline CPI first",
    weight: 0.92,
  },
  "Interest Rates|Housing": {
    relation: "mortgage affordability",
    blurb: "Higher rates cool purchase demand",
    weight: 0.9,
  },
  "Interest Rates|Banks": {
    relation: "net interest margin",
    blurb: "Policy path rewrites lending profitability",
    weight: 0.84,
  },
  "Interest Rates|Consumer Spending": {
    relation: "credit conditions",
    blurb: "Cost of capital slows discretionary spend",
    weight: 0.78,
  },
  "Interest Rates|Retail": {
    relation: "financing demand",
    blurb: "Big-ticket purchases pull back first",
    weight: 0.74,
  },
  "Interest Rates|Currencies": {
    relation: "rate differential",
    blurb: "Yield gaps drive FX flows",
    weight: 0.82,
  },
  "Interest Rates|Equities": {
    relation: "discount rates",
    blurb: "Valuations reprice on the risk-free path",
    weight: 0.8,
  },
  "Housing|Banks": {
    relation: "credit demand",
    blurb: "Mortgage books track housing activity",
    weight: 0.82,
  },
  "Housing|Construction": {
    relation: "starts & permits",
    blurb: "Builders follow housing demand cycles",
    weight: 0.88,
  },
  "Housing|Lumber": {
    relation: "materials demand",
    blurb: "Starts pull timber and building supply",
    weight: 0.8,
  },
  "Housing|Insurance": {
    relation: "property exposure",
    blurb: "Home values reshape underwriting risk",
    weight: 0.7,
  },
  "Housing|Retail": {
    relation: "home-related spend",
    blurb: "Furnishings and durables ride housing",
    weight: 0.72,
  },
  "Housing|Employment": {
    relation: "labor demand",
    blurb: "Construction and services jobs follow starts",
    weight: 0.68,
  },
  "AI CapEx|Semiconductors": {
    relation: "capacity constraint",
    blurb: "GPU and foundry supply set the ceiling",
    weight: 0.94,
  },
  "AI CapEx|Energy": {
    relation: "power demand",
    blurb: "Data centers pull grid and generation spend",
    weight: 0.86,
  },
  "AI CapEx|Cloud": {
    relation: "infra buildout",
    blurb: "Hyperscalers convert CapEx into capacity",
    weight: 0.9,
  },
  "AI CapEx|Labor": {
    relation: "skills scarcity",
    blurb: "AI roles reprice technical talent",
    weight: 0.7,
  },
  "AI CapEx|Productivity": {
    relation: "output lift",
    blurb: "Automation shifts margin and headcount mix",
    weight: 0.74,
  },
  "AI CapEx|Markets": {
    relation: "earnings narrative",
    blurb: "AI spend becomes the equity story",
    weight: 0.78,
  },
  "Shipping|Retail": {
    relation: "inventory lag",
    blurb: "Freight delays hit shelves and margins",
    weight: 0.8,
  },
  "Shipping|Inflation": {
    relation: "goods prices",
    blurb: "Container rates feed goods CPI",
    weight: 0.76,
  },
  "Shipping|Commodities": {
    relation: "bulk transport",
    blurb: "Dry bulk and tanker rates move with trade",
    weight: 0.78,
  },
  "Shipping|Manufacturing": {
    relation: "supply chain",
    blurb: "Parts availability tracks ocean schedules",
    weight: 0.74,
  },
  "Shipping|Freight": {
    relation: "rate cascade",
    blurb: "Ocean pricing spills into inland logistics",
    weight: 0.88,
  },
};

export function signalLinkMeta(hubLabel: string, satelliteLabel: string) {
  return (
    SIGNAL_LINK_META[`${hubLabel}|${satelliteLabel}`] ?? {
      relation: "cascades to",
      blurb: `${satelliteLabel} moves when ${hubLabel} shifts`,
      weight: 0.75,
    }
  );
}

/** Default Today's Signals rows (marketing + terminal fallback). */
export const TODAYS_SIGNALS_DEMO = [
  {
    id: "housing",
    label: "Housing Momentum",
    status: "↑ Rising",
    tone: "up" as const,
    icon: "home" as const,
    href: "#relationship-graph",
    hint: "Open Signal Graph",
    blurb: "Rates and starts feed the next housing cascade.",
  },
  {
    id: "ai",
    label: "AI Infrastructure",
    status: "↑ Accelerating",
    tone: "up" as const,
    icon: "cpu" as const,
    href: "#relationship-graph",
    hint: "Open Signal Graph",
    blurb: "CapEx, power, and semis light up together.",
  },
  {
    id: "inflation",
    label: "Inflation",
    status: "↓ Cooling",
    tone: "cool" as const,
    icon: "chart" as const,
    href: "#relationship-graph",
    hint: "Open Signal Graph",
    blurb: "Cooling CPI changes who inherits the next move.",
  },
  {
    id: "china",
    label: "Chinese Demand",
    status: "↑ Improving",
    tone: "up" as const,
    icon: "globe" as const,
    href: "#opportunity-radar",
    hint: "See Opportunity Radar",
    blurb: "Demand recovery shows up first in commodities and freight.",
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

export type OpportunityRadarBand = "strong" | "moderate" | "weakening" | "high_risk";
export type OpportunityRadarStatusTone = "growing" | "stable" | "weakening" | "risk";
export type OpportunityRadarCategory =
  | "technology"
  | "energy"
  | "defense"
  | "consumer"
  | "macro"
  | "industrial";

export type OpportunityRadarDemoCard = {
  theme: string;
  probability: number;
  confidence: number;
  horizon: string;
  evidence: readonly string[];
  analogue: string;
  beneficiaries: readonly string[];
  category: OpportunityRadarCategory;
  status: string;
  statusTone: OpportunityRadarStatusTone;
  delta: number;
  description: string;
  sparkline: readonly number[];
  affectedAssets: readonly string[];
  band: OpportunityRadarBand;
};

/** Premium Opportunity Radar™ demo themes — used by marketing + Probability Engine priors. */
export const OPPORTUNITY_RADAR_DEMO: readonly OpportunityRadarDemoCard[] = [
  {
    theme: "AI Infrastructure Boom",
    probability: 94,
    confidence: 91,
    horizon: "3–9 months",
    evidence: ["Hyperscaler CapEx", "Power & grid bids", "GPU lead times"],
    analogue: "2017–18 cloud CapEx cycle",
    beneficiaries: ["Semiconductors", "Data center REITs", "Power utilities"],
    category: "technology",
    status: "GROWING FAST",
    statusTone: "growing",
    delta: 6,
    description: "CapEx, power, and semis are reinforcing — second-order winners are lighting up first.",
    sparkline: [72, 75, 78, 82, 88, 91, 94],
    affectedAssets: ["NVDA", "SMCI", "VST"],
    band: "strong",
  },
  {
    theme: "Energy Transition",
    probability: 87,
    confidence: 84,
    horizon: "6–18 months",
    evidence: ["Grid interconnection queue", "IRA project FIDs", "Copper & silver demand"],
    analogue: "Early wind/solar build-out windows",
    beneficiaries: ["Utilities", "Copper", "Grid equipment"],
    category: "energy",
    status: "STRENGTHENING",
    statusTone: "growing",
    delta: 4,
    description: "Policy spend and physical bottlenecks keep the transition trade in a multi-quarter regime.",
    sparkline: [70, 73, 76, 79, 83, 85, 87],
    affectedAssets: ["NEE", "FCX", "ETN"],
    band: "strong",
  },
  {
    theme: "Defense Spending",
    probability: 82,
    confidence: 79,
    horizon: "6–24 months",
    evidence: ["Budget authorizations", "Munitions restock", "Allied CapEx"],
    analogue: "Post-2014 NATO replenishment cycle",
    beneficiaries: ["Aerospace primes", "Electronics", "Specialty materials"],
    category: "defense",
    status: "STRENGTHENING",
    statusTone: "growing",
    delta: 3,
    description: "Multi-year procurement and restocking create durable demand across the defense stack.",
    sparkline: [68, 71, 74, 76, 78, 80, 82],
    affectedAssets: ["LMT", "RTX", "LHX"],
    band: "strong",
  },
  {
    theme: "Consumer Weakness",
    probability: 74,
    confidence: 71,
    horizon: "1–6 months",
    evidence: ["Discretionary sales soft", "Credit delinquencies", "Wage real growth fade"],
    analogue: "Late-cycle consumer cooling episodes",
    beneficiaries: ["Value staples", "Discount retail", "Defensive cash"],
    category: "consumer",
    status: "WEAKENING",
    statusTone: "weakening",
    delta: -5,
    description: "Spend is rotating down the quality curve — watch who inherits share vs who loses it.",
    sparkline: [82, 80, 78, 77, 76, 75, 74],
    affectedAssets: ["AMZN", "HD", "SBUX"],
    band: "weakening",
  },
  {
    theme: "China Exports Slowdown",
    probability: 65,
    confidence: 62,
    horizon: "2–8 months",
    evidence: ["Export PMI soft", "Freight blank sailings", "Commodity import mix"],
    analogue: "2015–16 export deceleration window",
    beneficiaries: ["Select ASEAN exporters", "Domestic China stim names"],
    category: "macro",
    status: "HIGH RISK",
    statusTone: "risk",
    delta: -3,
    description: "External demand softens first in freight and commodities — cascades into global industrials.",
    sparkline: [78, 74, 71, 69, 67, 66, 65],
    affectedAssets: ["BABA", "FXI", "CAT"],
    band: "high_risk",
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
