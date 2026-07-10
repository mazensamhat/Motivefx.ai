import { LEARN_CATEGORIES } from "@/lib/site-config";
import type { EntityPageContent } from "../types";

type LearnArticle = EntityPageContent & { category: string };

const DISCLAIMER =
  "Educational content only — not financial, investment, tax, or gambling advice. Verify all data independently before acting.";

export const LEARN_ARTICLES: Record<string, LearnArticle> = {
  // ── Stocks ──────────────────────────────────────────────
  "stocks-module-overview": {
    slug: "stocks-module-overview",
    category: "stocks",
    title: "How MotiveFX Stocks Intelligence Works",
    metaDescription:
      "Overview of the MotiveFX stocks module — Motive Signal scores, daily briefs, institutional flow, and portfolio-aware alerts.",
    kicker: "Stocks",
    lead: "The stocks module is your daily equity command center: ranked opportunities, plain-English explanations, and Motive Signal confidence scores so you research the best ideas first.",
    sections: [
      {
        heading: "What you see each session",
        paragraphs: [
          "Open Stocks to a ranked radar of unusual volume, relative strength, institutional footprints, and narrative shifts. Each card includes a Motive Signal score (0–100) and a Why It Matters summary you can read in under 90 seconds.",
          "Coverage spans large-cap leaders, mid-cap growth names, and high-beta movers. Pair the radar with ticker deep-dives and Ask Motive AI for follow-up research.",
        ],
      },
      {
        heading: "Motive Signal for equities",
        paragraphs: [
          "Motive Signal weights unusual volume, relative strength, institutional accumulation patterns, options activity, and AI-assessed narrative momentum. Scores above 80 typically indicate multi-factor alignment — a prioritization cue, not a buy recommendation.",
        ],
      },
      {
        heading: "How to use it responsibly",
        paragraphs: [
          DISCLAIMER,
          "Use the module to prioritize research, not to outsource decisions. Cross-check prices and filings with primary sources before sizing any position.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is stock intelligence financial advice?",
        answer:
          "No. MotiveFX provides informational research tools. Consult a licensed advisor before making investment decisions.",
      },
    ],
    relatedLinks: [
      { label: "Stocks product page", href: "/stocks" },
      { label: "Motive Signal topic", href: "/topics/motive-signal" },
      { label: "AI Stock Analysis", href: "/topics/ai-stock-analysis" },
    ],
  },
  "reading-equity-signals": {
    slug: "reading-equity-signals",
    category: "stocks",
    title: "Reading Equity Signals Without the Noise",
    metaDescription:
      "A practical guide to interpreting MotiveFX equity signals — volume, flow, and narrative — without treating them as trade instructions.",
    kicker: "Stocks",
    lead: "Signals are filters. This guide shows how to read volume spikes, institutional prints, and narrative heat so you spend time on the right names.",
    sections: [
      {
        heading: "Volume vs conviction",
        paragraphs: [
          "A volume spike alone is not a thesis. Look for confluence: relative volume, price structure, and whether options or block prints agree with the move.",
          "MotiveFX surfaces multi-factor hits first so single-metric noise stays lower in the stack.",
        ],
      },
      {
        heading: "Build a repeatable checklist",
        paragraphs: [
          "1) Confirm the catalyst. 2) Check liquidity and float. 3) Review Motive Signal components. 4) Decide watch / research / pass. Journal the outcome in Decision History (Ultra) to improve over time.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "Technical Analysis track", href: "/learn/technical-analysis" },
      { label: "Institutional Buying", href: "/learn/institutional-buying" },
    ],
  },

  // ── Crypto ──────────────────────────────────────────────
  "crypto-module-overview": {
    slug: "crypto-module-overview",
    category: "crypto-guides",
    title: "MotiveFX Crypto Intelligence Overview",
    metaDescription:
      "How MotiveFX covers Bitcoin, Ethereum, and altcoins — whale flow, funding rates, narrative heat, and 24/7 Motive Signal scores.",
    kicker: "Crypto",
    lead: "Crypto never sleeps. MotiveFX tracks on-chain momentum, exchange flow, funding dynamics, and narrative heat — distilled into daily intelligence you can act on or ignore.",
    sections: [
      {
        heading: "24/7 coverage model",
        paragraphs: [
          "Unlike equities, crypto markets trade around the clock. The crypto module monitors whale wallets, exchange inflows/outflows, and funding rate extremes so you catch regime shifts whether you are at the desk or not.",
          "Pro+ push alerts surface only high-confidence hits on your watchlist — not every tick.",
        ],
      },
      {
        heading: "Majors vs altcoins",
        paragraphs: [
          "Primary coverage includes BTC, ETH, and SOL, plus a rotating set of high-activity altcoins based on volume and subscriber watchlists. Narrative tags help you see whether a move is L1 rotation, DeFi, or meme-driven.",
        ],
      },
      {
        heading: "Risk framing",
        paragraphs: [DISCLAIMER, "Crypto is highly volatile. Treat Motive Signal as a research prioritizer, not a timing oracle."],
      },
    ],
    faqs: [
      {
        question: "Do you track personal wallets?",
        answer: "No. We surface aggregated whale and exchange flow signals, not personal wallet tracking.",
      },
    ],
    relatedLinks: [
      { label: "Crypto product page", href: "/crypto" },
      { label: "AI Crypto Analysis", href: "/topics/ai-crypto-analysis" },
    ],
  },
  "funding-rates-explained": {
    slug: "funding-rates-explained",
    category: "crypto-guides",
    title: "Funding Rates Explained for Research",
    metaDescription:
      "What perpetual futures funding rates mean, how MotiveFX uses them as context, and why extreme funding is a research flag — not a trade signal.",
    kicker: "Crypto",
    lead: "Funding rates show who is paying whom to hold perpetual futures. Extremes often coincide with crowded positioning — useful context for research.",
    sections: [
      {
        heading: "Positive vs negative funding",
        paragraphs: [
          "Positive funding means longs pay shorts — often a crowded long. Negative funding means shorts pay longs. MotiveFX flags extremes relative to recent history for majors and liquid alts.",
        ],
      },
      {
        heading: "Pair with spot and flow",
        paragraphs: [
          "Funding alone can mislead. Combine with spot trend, exchange netflow, and Motive Signal narrative tags before drawing conclusions.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: [{ label: "Crypto module", href: "/markets/crypto" }],
  },

  // ── Options ─────────────────────────────────────────────
  "reading-options-flow": {
    slug: "reading-options-flow",
    category: "options-flow",
    title: "How to Read Options Flow",
    metaDescription:
      "Beginner guide to unusual options activity, sweeps vs blocks, and how MotiveFX explains flow in plain English.",
    kicker: "Options Flow",
    lead: "Options flow shows where capital bets on direction, volatility, or hedging. MotiveFX flags unusual activity and explains why it might matter for the underlying.",
    sections: [
      {
        heading: "Sweeps vs blocks",
        paragraphs: [
          "Sweeps hit multiple exchanges quickly and often signal urgency. Blocks are large negotiated prints. Both can be bullish, bearish, or hedges — context matters.",
        ],
      },
      {
        heading: "Unusual activity thresholds",
        paragraphs: [
          "We benchmark contracts against recent volume and open interest baselines. When activity exceeds statistical thresholds, it enters your radar with direction, size, and expiry context.",
        ],
      },
      {
        heading: "Educational use only",
        paragraphs: [DISCLAIMER],
      },
    ],
    faqs: [
      {
        question: "What is unusual options activity?",
        answer:
          "Volume or open interest that significantly exceeds recent norms, often indicating institutional or informed positioning — or aggressive hedging.",
      },
    ],
    relatedLinks: [
      { label: "Options product page", href: "/options" },
      { label: "What is Open Interest?", href: "/metrics/open-interest" },
      { label: "What is Gamma?", href: "/metrics/gamma" },
    ],
  },
  "options-module-overview": {
    slug: "options-module-overview",
    category: "options-flow",
    title: "MotiveFX Options Flow Module",
    metaDescription:
      "Tour the MotiveFX options intelligence module — unusual activity, IV context, and links into equity Motive Signal.",
    kicker: "Options Flow",
    lead: "The options module turns dense flow prints into ranked research cards with expiry, strike, and Why It Matters context.",
    sections: [
      {
        heading: "What ships in the module",
        paragraphs: [
          "Unusual volume and open interest shifts, sweep detection, and event-aware IV context ahead of earnings and macro prints.",
          "Every hit links to the underlying equity view so you can compare flow with stock Motive Signal and institutional buying.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "AI Options Flow topic", href: "/topics/ai-options-flow" },
      { label: "Stocks learning track", href: "/learn/stocks" },
    ],
  },

  // ── Prediction markets ──────────────────────────────────
  "prediction-markets-overview": {
    slug: "prediction-markets-overview",
    category: "prediction-markets",
    title: "Prediction Markets & Polymarket Intelligence",
    metaDescription:
      "How MotiveFX tracks Polymarket and prediction markets — probability shifts, catalysts, and research briefs for forecast traders.",
    kicker: "Prediction Markets",
    lead: "When probabilities move, something changed. MotiveFX tracks prediction markets — elections, macro, crypto events — and explains repricing in plain English.",
    sections: [
      {
        heading: "Probability shift detection",
        paragraphs: [
          "We alert when contracts reprice beyond historical volatility bands, with catalyst tagging and cross-market consistency checks against equities and crypto where relevant.",
        ],
      },
      {
        heading: "Event-linked research",
        paragraphs: [
          "Major contracts get research context: resolution criteria, liquidity depth, historical accuracy of similar markets, and related asset exposure.",
        ],
      },
      {
        heading: "Compliance note",
        paragraphs: [
          DISCLAIMER,
          "Prediction-market features may be restricted by jurisdiction. You are responsible for lawful use where you are located.",
        ],
      },
    ],
    faqs: [
      {
        question: "Which markets do you cover?",
        answer:
          "Primary coverage includes Polymarket and major event markets; expansion is continuous based on liquidity and subscriber demand.",
      },
    ],
    relatedLinks: [
      { label: "Predictions product page", href: "/predictions" },
      { label: "Prediction Market Analysis", href: "/topics/prediction-market-analysis" },
    ],
  },
  "reading-probability-shifts": {
    slug: "reading-probability-shifts",
    category: "prediction-markets",
    title: "Reading Probability Shifts Like a Researcher",
    metaDescription:
      "A practical framework for interpreting prediction-market probability moves without treating them as guaranteed outcomes.",
    kicker: "Prediction Markets",
    lead: "A 10-point probability jump is a headline — not a conclusion. Use liquidity, time-to-resolution, and catalyst quality before updating your view.",
    sections: [
      {
        heading: "Liquidity first",
        paragraphs: [
          "Thin markets can whip on small size. MotiveFX highlights depth context so you do not over-read a low-liquidity print.",
        ],
      },
      {
        heading: "Cross-check other modules",
        paragraphs: [
          "Election or macro contracts often move stocks and crypto together. Ultra subscribers see these markets side-by-side in one terminal.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: [{ label: "Data sources", href: "/data-sources" }],
  },

  // ── Sports ──────────────────────────────────────────────
  "sports-module-overview": {
    slug: "sports-module-overview",
    category: "sports-betting-analytics",
    title: "Sports Betting Analytics on MotiveFX",
    metaDescription:
      "How MotiveFX sports intelligence tracks line movement, sharp vs public money, and model edges — analytics, not a picks service.",
    kicker: "Sports Betting",
    lead: "Lines move for a reason. MotiveFX tracks sharp vs public money, injury-driven repricing, and model divergence so you research with context — not gut feel.",
    sections: [
      {
        heading: "Line movement intelligence",
        paragraphs: [
          "See when books move numbers against public ticket count — a classic sharp signal. MotiveFX timestamps moves and tags likely catalysts such as injuries or weather.",
        ],
      },
      {
        heading: "Multi-sport coverage",
        paragraphs: [
          "NFL, NBA, MLB, NHL, soccer, and major combat cards during season. Daily sports intelligence pages publish fresh summaries for subscribers.",
        ],
      },
      {
        heading: "Not a picks service",
        paragraphs: [
          DISCLAIMER,
          "We provide analytics and context, not guaranteed picks. Gamble only where lawful and only with risk capital.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does MotiveFX place bets for me?",
        answer:
          "No. MotiveFX does not accept wagers, hold funds, or execute bets. It is informational software only.",
      },
    ],
    relatedLinks: [
      { label: "Sports product page", href: "/sports" },
      { label: "Sports Betting Analytics topic", href: "/topics/sports-betting-analytics" },
      { label: "Today's Sports Intelligence", href: "/daily/sports-intelligence" },
    ],
  },
  "sharp-vs-public-money": {
    slug: "sharp-vs-public-money",
    category: "sports-betting-analytics",
    title: "Sharp vs Public Money — A Research Primer",
    metaDescription:
      "Learn how MotiveFX frames sharp versus public betting splits as research context for line movement analysis.",
    kicker: "Sports Betting",
    lead: "When ticket count and money disagree, books often respect the money. That split is a research flag — not a lock.",
    sections: [
      {
        heading: "What the split means",
        paragraphs: [
          "Public-heavy ticket sides with reverse line movement can indicate professional money on the other side. MotiveFX surfaces these divergences with timestamps.",
        ],
      },
      {
        heading: "Limitations",
        paragraphs: [
          "Splits are imperfect and delayed. Always combine with injury news, weather, and your own bankroll rules.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: [{ label: "Sports module", href: "/markets/sports" }],
  },

  // ── Pink slips ──────────────────────────────────────────
  "pink-slips-overview": {
    slug: "pink-slips-overview",
    category: "pink-sheets",
    title: "Pink Slips & Micro-Cap Intelligence",
    metaDescription:
      "How MotiveFX Pink Slips module flags OTC and micro-cap volume breakouts with explicit risk labeling and dilution context.",
    kicker: "Pink Slips",
    lead: "Micro-caps move fast and fail often. The Pink Slips module focuses on volume breakouts, dilution risk flags, and narrative spikes — with explicit risk labeling.",
    sections: [
      {
        heading: "Breakout radar",
        paragraphs: [
          "Scan for first-day volume explosions and multi-day accumulation patterns on OTC and low-float names. Every hit includes float context and recent filing flags when available.",
        ],
      },
      {
        heading: "Risk-first design",
        paragraphs: [
          "Pink sheet trading is high risk. We surface dilution, reverse split history, and promotion patterns where data exists — so hype is never the only story.",
          DISCLAIMER,
        ],
      },
    ],
    faqs: [
      {
        question: "Are pink sheet stocks suitable for everyone?",
        answer:
          "No. These are speculative instruments. Only risk capital; many names lack liquidity and disclosure quality.",
      },
    ],
    relatedLinks: [
      { label: "Pink Sheets product page", href: "/pink-sheets" },
      { label: "Pink Sheet Stocks topic", href: "/topics/pink-sheet-stocks" },
      { label: "What is Relative Volume?", href: "/metrics/relative-volume" },
    ],
  },
  "otc-risk-checklist": {
    slug: "otc-risk-checklist",
    category: "pink-sheets",
    title: "OTC / Micro-Cap Risk Checklist",
    metaDescription:
      "A practical risk checklist before researching any pink sheet or micro-cap name flagged by MotiveFX.",
    kicker: "Pink Slips",
    lead: "Before you dig into a breakout name, run this checklist. Skipping it is how speculative capital disappears.",
    sections: [
      {
        heading: "Checklist",
        paragraphs: [
          "1) Liquidity — can you exit without crushing the book? 2) Dilution / ATM history. 3) Promotion or paid IR patterns. 4) Filing currency and auditor notes. 5) Why Motive Signal fired (volume only vs multi-factor).",
          "If any item fails, default to pass. MotiveFX will still show the name for awareness — awareness is not a thesis.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: [{ label: "Stocks track", href: "/learn/stocks" }],
  },

  // ── AI investing ────────────────────────────────────────
  "what-is-ai-investing": {
    slug: "what-is-ai-investing",
    category: "ai-investing",
    title: "What is AI Investing?",
    metaDescription:
      "Introduction to AI investing — tools, limits, and how MotiveFX fits your research stack without replacing human judgment.",
    kicker: "AI Investing",
    lead: "AI investing uses machine learning and large language models to process market data faster than manual research. MotiveFX is a research accelerator — not a fiduciary advisor.",
    sections: [
      {
        heading: "Tools vs advice",
        paragraphs: [
          "AI platforms like MotiveFX compress filings, flow, and news into ranked briefs. They do not know your full financial situation and do not create a client relationship.",
        ],
      },
      {
        heading: "Human in the loop",
        paragraphs: [
          "The best outcomes combine AI speed with human judgment on sizing, risk, and whether a signal fits your plan.",
          DISCLAIMER,
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "How AI analyzes stocks", href: "/ai/how-ai-analyzes-stocks" },
      { label: "Stocks learning track", href: "/learn/stocks" },
    ],
  },
  "motive-ai-memory": {
    slug: "motive-ai-memory",
    category: "ai-investing",
    title: "Motive AI Memory (Pro+)",
    metaDescription:
      "How MotiveFX AI Memory learns your sectors, risk profile, and watchlist preferences — and what it never does with your data.",
    kicker: "AI Investing",
    lead: "On Pro and above, AI Memory personalizes briefings around your interests without selling your data or training third-party models on your journal.",
    sections: [
      {
        heading: "What memory stores",
        paragraphs: [
          "Sector preferences, risk tolerance cues, and watchlist context so Ask Motive AI and daily briefs stay relevant.",
        ],
      },
      {
        heading: "Privacy",
        paragraphs: [
          "Memory is per-account. See our Privacy Policy for processing details and your rights to access or delete data.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Data deletion", href: "/data-deletion" },
    ],
  },

  // ── Institutional buying ────────────────────────────────
  "institutional-flow-basics": {
    slug: "institutional-flow-basics",
    category: "institutional-buying",
    title: "Institutional Buying Basics",
    metaDescription:
      "Learn how MotiveFX frames institutional accumulation, block prints, and smart-money context for equity research.",
    kicker: "Institutional Buying",
    lead: "When funds and block traders move size, MotiveFX highlights accumulation and distribution patterns against historical baselines.",
    sections: [
      {
        heading: "What we surface",
        paragraphs: [
          "Block activity, unusual accumulation patterns, and links to congress trading disclosures where relevant. Pair with options flow for a fuller positioning picture.",
        ],
      },
      {
        heading: "Limits of the data",
        paragraphs: [
          "Filings and prints can lag. Treat institutional context as one input among many — never as a guaranteed follow-the-smart-money trade.",
          DISCLAIMER,
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "Institutional Buying topic", href: "/topics/institutional-buying" },
      { label: "Congress Trading Tracker", href: "/topics/congress-trading-tracker" },
    ],
  },

  // ── Earnings ────────────────────────────────────────────
  "earnings-prep-playbook": {
    slug: "earnings-prep-playbook",
    category: "earnings-analysis",
    title: "Earnings Prep Playbook",
    metaDescription:
      "How to use MotiveFX before and after earnings — implied move context, historical behavior, and AI briefing notes.",
    kicker: "Earnings Analysis",
    lead: "Earnings weeks create noise. MotiveFX surfaces implied move context, historical post-earnings behavior, and AI-generated briefing notes so you open the terminal prepared.",
    sections: [
      {
        heading: "Before the print",
        paragraphs: [
          "Review implied move, options positioning, and Motive Signal on the name. Decide in advance whether you are watching, hedging research, or sitting out.",
        ],
      },
      {
        heading: "After the print",
        paragraphs: [
          "Since You Were Away catches overnight gaps and pre-market catalysts. Compare the reaction to historical analogs before updating your thesis.",
          DISCLAIMER,
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "Stocks module", href: "/stocks" },
      { label: "Options flow track", href: "/learn/options-flow" },
    ],
  },

  // ── Technical analysis ──────────────────────────────────
  "ta-with-motive-signal": {
    slug: "ta-with-motive-signal",
    category: "technical-analysis",
    title: "Technical Analysis with Motive Signal",
    metaDescription:
      "Combine classic technical analysis with MotiveFX Motive Signal scores — confluence over single-indicator trading.",
    kicker: "Technical Analysis",
    lead: "Charts show structure; Motive Signal adds multi-factor context. Use both as research tools, not as automated entry systems.",
    sections: [
      {
        heading: "Confluence over single indicators",
        paragraphs: [
          "Relative strength, volume, and structure mean more when options flow and narrative tags agree. MotiveFX ranks multi-factor alignment so you are not staring at one oscillator.",
        ],
      },
      {
        heading: "Keep a journal",
        paragraphs: [
          "Record what you saw, what you did, and what happened. Ultra Decision History makes this easier over time.",
          DISCLAIMER,
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "What is Relative Volume?", href: "/metrics/relative-volume" },
      { label: "Motive Signal", href: "/topics/motive-signal" },
    ],
  },

  // ── Market psychology ───────────────────────────────────
  "bias-checklist": {
    slug: "bias-checklist",
    category: "market-psychology",
    title: "Trader Bias Checklist",
    metaDescription:
      "A short market psychology checklist — FOMO, confirmation bias, and revenge trading — for MotiveFX users.",
    kicker: "Market Psychology",
    lead: "The terminal can show you everything and still lose money if psychology runs the session. Use this checklist before you size up.",
    sections: [
      {
        heading: "Common traps",
        paragraphs: [
          "FOMO after a Motive Signal spike, confirmation bias when reading Why It Matters, and revenge research after a loss. Pause, re-read the disclaimer, and shrink size when emotions rise.",
        ],
      },
      {
        heading: "Process over prediction",
        paragraphs: [
          "MotiveFX is built for process: brief → prioritize → research → decide. Prediction without process is gambling with extra steps.",
          DISCLAIMER,
        ],
      },
    ],
    faqs: [],
    relatedLinks: [
      { label: "AI Investing track", href: "/learn/ai-investing" },
      { label: "Why MotiveFX", href: "/why-motivefx" },
    ],
  },
};

const CATEGORY_COPY: Record<
  string,
  { lead: string; sections: EntityPageContent["sections"]; faqs: EntityPageContent["faqs"] }
> = {
  stocks: {
    lead: "Learn how MotiveFX stock intelligence ranks equities, explains Motive Signal, and helps you research without drowning in noise.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "Module walkthroughs, signal reading, and responsible use of equity intelligence across large-caps, mid-caps, and high-beta names.",
          "Start with the stocks module overview, then practice reading multi-factor signals before you dig into individual tickers.",
        ],
      },
      {
        heading: "Related product",
        paragraphs: [
          "Open the live Stocks experience for ranked opportunities, or continue with the guides below.",
        ],
      },
    ],
    faqs: [
      {
        question: "Does this replace a broker?",
        answer: "No. MotiveFX does not execute trades or hold funds. It is research software only.",
      },
    ],
  },
  "crypto-guides": {
    lead: "Guides for MotiveFX crypto intelligence — majors, altcoins, funding context, and 24/7 Motive Signal research.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "Crypto module overview, funding rates as research context, and how to pair on-chain/flow cues with narrative tags.",
        ],
      },
    ],
    faqs: [],
  },
  "options-flow": {
    lead: "Learn unusual options activity, sweeps vs blocks, and how MotiveFX turns flow into plain-English research cards.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "Reading options flow, module tour, and links into equity Motive Signal so flow never sits in isolation.",
        ],
      },
    ],
    faqs: [],
  },
  "prediction-markets": {
    lead: "Educational guides for Polymarket and prediction-market probability shifts on MotiveFX.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "Module overview, reading probability shifts with liquidity context, and jurisdiction-aware responsible use.",
        ],
      },
    ],
    faqs: [],
  },
  "sports-betting-analytics": {
    lead: "Sports betting analytics education — line movement, sharp vs public money, and MotiveFX research framing (not picks).",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "Sports module overview and sharp-vs-public primers. Analytics only — MotiveFX does not place bets.",
        ],
      },
    ],
    faqs: [],
  },
  "pink-sheets": {
    lead: "Pink Slips / micro-cap education — breakout radar, OTC risk checklists, and why risk labeling comes first.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "Module overview and a practical OTC risk checklist before you research any speculative name.",
        ],
      },
    ],
    faqs: [],
  },
  "ai-investing": {
    lead: "Foundations of AI-assisted investing research — tools vs advice, Motive AI Memory, and human-in-the-loop process.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "What AI investing is (and is not), plus how MotiveFX personalization works on Pro+ without selling your data.",
        ],
      },
    ],
    faqs: [],
  },
  "institutional-buying": {
    lead: "Understand institutional accumulation, block context, and how MotiveFX pairs smart-money cues with options and equity signals.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: [
          "Institutional flow basics and links to congress trading and options flow for a fuller positioning picture.",
        ],
      },
    ],
    faqs: [],
  },
  "earnings-analysis": {
    lead: "Prepare for earnings with MotiveFX — implied moves, historical analogs, and post-print briefing habits.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: ["A practical earnings prep playbook for before and after the print."],
      },
    ],
    faqs: [],
  },
  "technical-analysis": {
    lead: "Combine classic technical analysis with Motive Signal multi-factor confluence for research prioritization.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: ["How to use TA with Motive Signal without turning indicators into autopilot entries."],
      },
    ],
    faqs: [],
  },
  "market-psychology": {
    lead: "Market psychology for MotiveFX users — bias checklists, FOMO control, and process over prediction.",
    sections: [
      {
        heading: "What this track covers",
        paragraphs: ["A trader bias checklist designed for signal-heavy terminals."],
      },
    ],
    faqs: [],
  },
};

export function getLearnArticle(category: string, slug: string): LearnArticle | undefined {
  const article = LEARN_ARTICLES[slug];
  if (!article || article.category !== category) return undefined;
  return article;
}

export function getLearnCategory(slug: string): EntityPageContent | undefined {
  const cat = LEARN_CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return undefined;
  const articles = Object.values(LEARN_ARTICLES).filter((a) => a.category === slug);
  const copy = CATEGORY_COPY[slug];
  return {
    slug,
    title: cat.label,
    metaDescription: `Learn ${cat.label.toLowerCase()} on MotiveFX — guides, module overviews, and educational explainers.`,
    kicker: "Learning center",
    lead: copy?.lead ?? `Educational guides on ${cat.label.toLowerCase()}. We teach first — authority follows.`,
    sections: [
      ...(copy?.sections ?? []),
      {
        heading: "Guides in this track",
        paragraphs: [
          articles.length
            ? `${articles.length} guide${articles.length === 1 ? "" : "s"} below. Each is written for research use only — not financial advice.`
            : "Guides for this track are being expanded. Check back soon or browse related product pages.",
        ],
      },
    ],
    faqs: copy?.faqs ?? [],
    relatedLinks: [
      ...articles.map((a) => ({ label: a.title, href: `/learn/${slug}/${a.slug}` })),
      { label: "All Learning Center tracks", href: "/learn" },
    ],
  };
}

export function allLearnCategorySlugs() {
  return LEARN_CATEGORIES.map((c) => c.slug);
}

export function allLearnArticleParams() {
  return Object.values(LEARN_ARTICLES).map((a) => ({
    category: a.category,
    slug: a.slug,
  }));
}
