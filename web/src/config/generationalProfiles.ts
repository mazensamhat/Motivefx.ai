export type CohortId = "genz" | "millennial" | "genx" | "boomer";

export interface GenerationalProfile {
  id: CohortId;
  name: string;
  ageRange: string;
  accent: string;
  glow: string;
  strategyFocus: string;
  tagline: string;
  fomo: string;
  priceFraming: string;
  ctaHeader: string;
  ctaSub: string;
  ctaButtonText: string;
  ctaPriceFrame: string;
  upgradeButtonText: string;
  dismissButtonText: string;
  pricingHeadline: string;
  dailyCostFraming: string;
  strategyVisual: string;
  strategyCopy: string;
  /** Intel desk voice — informational tone, not pricing */
  intelLoadingMessage: string;
  intelInsightsTitle: string;
  intelHomeTipLabel: string;
  intelAudioIntro: string;
}

export const GENERATIONAL_PROFILES: Record<CohortId, GenerationalProfile> = {
  genz: {
    id: "genz",
    name: "Gen Z",
    ageRange: "14–29",
    accent: "#D500F9",
    glow: "rgba(213, 0, 249, 0.25)",
    strategyFocus: "Gamification · FOMO · Social Proof",
    tagline: "Stop Trading on Lag. Frontrun the Market.",
    fomo:
      "You are placed in the public data queue subject to a 100ms lag. Whales move. Markets run. Standard plans exit too late.",
    priceFraming:
      "Secure the complete 5-module annual priority terminal for less than the cost of a daily energy drink.",
    ctaHeader: "Get Unlimited DMA Signals",
    ctaSub: "Stop using laggy rate-limited feeds",
    ctaButtonText: "Secure Instant Alpha Pass",
    ctaPriceFrame: "Framed as $2.18 a day",
    upgradeButtonText: "Activate Priority Annual Access",
    dismissButtonText: "Dismiss Signal",
    pricingHeadline: "Unthrottled 100ms feeds · neon alpha terminal",
    dailyCostFraming: "less than a daily energy drink or iced latte",
    strategyVisual:
      "Aggressive neon indicators, gamified bar-charts, and high-tempo tickers focused on high-beta setups.",
    strategyCopy:
      "Micro-pricing comparisons ($2.18/day) and extreme FOMO around late rate-limited signals.",
    intelLoadingMessage: "Scanning live signal matrix…",
    intelInsightsTitle: "AI Signal Desk",
    intelHomeTipLabel: "Fast-lane intel",
    intelAudioIntro: "Quick pulse check.",
  },
  millennial: {
    id: "millennial",
    name: "Millennial",
    ageRange: "30–45",
    accent: "#00E5FF",
    glow: "rgba(0, 229, 255, 0.25)",
    strategyFocus: "Arbitrage · Workspace Efficiency · ROI",
    tagline: "Maximize Arbitrage. Automate Your Holdings Tracker.",
    fomo:
      "Your trading desk operates in a single market silo. Connect predicts, stocks, and crypto pipelines to capture systemic cross-market alpha first.",
    priceFraming:
      "Save over $941/year with the unified annual layout compared to separate à la carte monthly subscriptions.",
    ctaHeader: "Cross-Market Synthesizer",
    ctaSub: "Merge predict trends, web3 wallets & options",
    ctaButtonText: "Deploy Unified Strategy Desk",
    ctaPriceFrame: "or Annual Pass ($799/yr)",
    upgradeButtonText: "Deploy Unified Strategy Desk",
    dismissButtonText: "Continue with single-module desk",
    pricingHeadline: "Cross-market terminal · ROI-optimized workflow",
    dailyCostFraming: "automating 10 hours of manual research per week",
    strategyVisual:
      "Sleek cyan palette with professional sparkline charts and structured KPI badges.",
    strategyCopy:
      "Workflow productivity, multi-market arbitrage advantages, and comprehensive ROI metrics.",
    intelLoadingMessage: "Synthesizing cross-market signals…",
    intelInsightsTitle: "AI Insights Desk",
    intelHomeTipLabel: "Desk tip",
    intelAudioIntro: "Here's your morning intel.",
  },
  genx: {
    id: "genx",
    name: "Gen X",
    ageRange: "46–61",
    accent: "#FFAB00",
    glow: "rgba(255, 171, 0, 0.25)",
    strategyFocus: "Risk Management · Backtesting · Security",
    tagline: "Institutional-Grade Hedging. Secure Capital.",
    fomo:
      "Volatile world-market cycles can disrupt years of capital growth overnight. Secure continuous strategic hedging coverage and low-latency indicators.",
    priceFraming:
      "A professional risk-intel workspace priced at a fraction of traditional research desks. Billed as a flat annual fee.",
    ctaHeader: "Priority Risk Reports",
    ctaSub: "Includes automated backtesting & custom desks",
    ctaButtonText: "Incorporate Risk Control Desks",
    ctaPriceFrame: "Risk-adjusted flat-rate",
    upgradeButtonText: "Incorporate Risk Control Desks",
    dismissButtonText: "Continue with standard risk tier",
    pricingHeadline: "Backtested win rates · hedged risk grids",
    dailyCostFraming: "a fraction of legacy market-research subscriptions",
    strategyVisual:
      "Warm amber theme, high-density risk grids, and performance metrics structured for risk-to-reward ratios.",
    strategyCopy:
      "Capital preservation, robust risk profiles, extensive backtesting models, and system security parameters.",
    intelLoadingMessage: "Running risk-adjusted signal review…",
    intelInsightsTitle: "AI Risk Lens",
    intelHomeTipLabel: "Risk-aware intel",
    intelAudioIntro: "Your risk and signal summary.",
  },
  boomer: {
    id: "boomer",
    name: "Baby Boomer",
    ageRange: "62+",
    accent: "#1976D2",
    glow: "rgba(25, 118, 210, 0.25)",
    strategyFocus: "Capital Preservation · Classic Charts · PDFs",
    tagline: "Capital Preservation & Clear Financial Reports.",
    fomo:
      "Inflation, geopolitical conflict, and complicated modern systems threaten classic retirement security. Secure clear, audited insights daily.",
    priceFraming:
      "A completely transparent flat yearly subscription with no hidden asset management commission adjustments.",
    ctaHeader: "Secure Family Legacy",
    ctaSub: "Includes weekly PDF reports & plain-English summaries",
    ctaButtonText: "Incorporate Capital Safeguards",
    ctaPriceFrame: "No hidden brokerage charges",
    upgradeButtonText: "Incorporate Capital Safeguards",
    dismissButtonText: "Continue with basic monthly access",
    pricingHeadline: "Plain English reports · high-contrast charts",
    dailyCostFraming: "a transparent flat yearly rate with no hidden fees",
    strategyVisual:
      "Clean high-contrast light mode, classic serif typography, large legible text, and easy-to-use buttons.",
    strategyCopy:
      "Absolute trust, plain English reports, weekly PDF delivery, and legacy asset shielding.",
    intelLoadingMessage: "Preparing your plain-English signal summary…",
    intelInsightsTitle: "AI Intel Summary",
    intelHomeTipLabel: "Plain-language tip",
    intelAudioIntro: "Your daily intel, in plain English.",
  },
};

export const COHORT_ORDER: CohortId[] = ["genz", "millennial", "genx", "boomer"];

export function profileForCohort(id: string | null | undefined): GenerationalProfile {
  if (id && id in GENERATIONAL_PROFILES) {
    return GENERATIONAL_PROFILES[id as CohortId];
  }
  return GENERATIONAL_PROFILES.millennial;
}
