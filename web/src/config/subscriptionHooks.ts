import type { BrandModuleId } from "../brand/moduleBrand";

export type HookModuleKey = "trades" | "penny" | "crypto" | "betting" | "predictions" | "bundle";

export interface SubscriptionHook {
  key: HookModuleKey;
  title: string;
  badge: string;
  brand: BrandModuleId;
  leverLabel: string;
  teaserBadge: string;
  hookHeader: string;
  description: string;
  annualAdvantage: string;
  monthlyLimitations: string;
  annualPerks: string;
}

export const MODULE_PRICE = 29;
export const BUNDLE_PRICE = 109;

export const SUBSCRIPTION_HOOKS: Record<HookModuleKey, SubscriptionHook> = {
  trades: {
    key: "trades",
    title: "Trades Option Block Flow",
    badge: "TRADES CONVERSION",
    brand: "trades",
    leverLabel: "Time Sensitivity & Speed",
    teaserBadge: "LOSS AVERSION · LATENCY",
    hookHeader: "Don't get rate-limited during the next major volatility breakout.",
    description:
      "Standard monthly feeds sit in the public data-sweep lane with throttled updates. When a dark pool sweeps $50M in options, latency is the difference between capturing delta entry or buying exit liquidity.",
    annualAdvantage:
      "Priority block-flow alerts, full history index, and uninterrupted coverage through earnings season.",
    monthlyLimitations: "Rate-limited feed, restricted archive searches, manual refresh cycles.",
    annualPerks: "Direct pipeline access · zero throttling · full history index",
  },
  penny: {
    key: "penny",
    title: "Pink Slips Penny Scanner",
    badge: "PINK SLIPS CONVERSION",
    brand: "pinkslips",
    leverLabel: "Catalyst Timeline Alignment",
    teaserBadge: "LOSS AVERSION · OFF-CYCLE",
    hookHeader: "The microcap catalyst lifecycle takes quarters, not billing cycles.",
    description:
      "OTC listings operate on multi-quarter regulatory filings. A 30-day slot risks missing the core exit liquidity event while waiting on late SEC disclosures.",
    annualAdvantage:
      "Priority microcap volume alerts, insider transaction logs, and unlimited multi-ticker background sweeps.",
    monthlyLimitations: "Single-month coverage, limited archive depth, delayed filing alerts.",
    annualPerks: "Full catalyst-cycle tracking · insider Form-4 queue · unlimited sweeps",
  },
  crypto: {
    key: "crypto",
    title: "Crypto On-Chain Whale Tracker",
    badge: "CRYPTO CONVERSION",
    brand: "crypto",
    leverLabel: "Long-Term Volatility Cycles",
    teaserBadge: "LOSS AVERSION · WINTER GAPS",
    hookHeader: "Whales move spot reserves on their time, not yours.",
    description:
      "Crypto accumulation cycles take months to construct and distributions happen overnight. Canceling during flat winters means missing early exchange inflows that mark cycle shifts.",
    annualAdvantage:
      "Deep historical address clustering, multi-signature wallet alerts, and uninterrupted on-chain liquidity monitoring.",
    monthlyLimitations: "Shorter lookback windows, delayed whale alerts, standard refresh tier.",
    annualPerks: "Historical clustering · $10M+ transfer warnings · year-round coverage",
  },
  betting: {
    key: "betting",
    title: "Sharp Sportsbook Monitor",
    badge: "BETTING CONVERSION",
    brand: "betting",
    leverLabel: "Seasonal Value Framing",
    teaserBadge: "VALUE REFRAME · SEASON SPAN",
    hookHeader: "A single sports season spans 8 months. Stop paying off-season premiums.",
    description:
      "Subscribing monthly means paying peak-season rates, then canceling off-season and losing historical syndicate trend sheets. Annual locks year-round models for less than four monthly payments.",
    annualPerks: "Year-round line shifts · sharp consensus splits · pro book modeling",
    annualAdvantage:
      "Year-round access to early line shifts, sharp consensus splits, and professional sportsbook modeling updates.",
    monthlyLimitations: "Seasonal gaps, limited historical line archive, standard latency tier.",
  },
  predictions: {
    key: "predictions",
    title: "Predictions Event Markets",
    badge: "PREDICTIONS CONVERSION",
    brand: "predictions",
    leverLabel: "Arbitrage Continuity",
    teaserBadge: "LOSS AVERSION · EVENT CYCLE",
    hookHeader: "Elections and wars don't conform to a 30-day calendar cycle.",
    description:
      "Geopolitical prediction contracts are multi-month narratives. Monthly plans risk data blackout mid-cycle before the climax of high-stakes Kalshi and Polymarket contracts.",
    annualAdvantage:
      "Uninterrupted event-market feed, priority database searches, and full-cycle probability path tracking.",
    monthlyLimitations: "Rate-limited API tier, restricted history search, manual contract updates.",
    annualPerks: "Zero-latency sentiment scanner · full history index · priority search",
  },
  bundle: {
    key: "bundle",
    title: "MotiveFX All-Access Annual Pass",
    badge: "ALL-ACCESS PACKAGE",
    brand: "crypto",
    leverLabel: "Cross-Market Synergy",
    teaserBadge: "FEATURE LOCK-IN · SYNTHESIS",
    hookHeader: "Alpha does not live in a silo. Cross-market synthetics are here.",
    description:
      "When NVDA releases earnings it moves AI tokens, shifts macro policy odds, and ripples through sports sentiment. Individual modules miss structural correlation — wealth is found at the nexus.",
    annualAdvantage:
      "Unified cross-market synthesizers, all five desks, and prioritized neural networks in one annual pass.",
    monthlyLimitations: "Siloed module access, slower cross-desk correlation, separate billing.",
    annualPerks: "Cross-market desk · unified terminal · priority API access",
  },
};

export function hookForModule(module: string): SubscriptionHook {
  const key = (module in SUBSCRIPTION_HOOKS ? module : "trades") as HookModuleKey;
  return SUBSCRIPTION_HOOKS[key];
}

export function dailyAnnualCost(annualPrice: number): string {
  return (annualPrice / 365).toFixed(2);
}

export function monthlyAnnualEquiv(annualPrice: number): string {
  return (annualPrice / 12).toFixed(2);
}

export interface SavingsBreakdown {
  alacarteMonthly: number;
  alacarteYearly: number;
  bundleYearly: number;
  bundleActive: boolean;
  referenceYearly: number;
  annualPrice: number;
  savings: number;
  savingsLabel: string;
}

export function calcSavings(
  selectedIds: string[],
  annualPrice: number,
  modulePrice = MODULE_PRICE,
  bundlePrice = BUNDLE_PRICE
): SavingsBreakdown {
  const count = selectedIds.length;
  const alacarteMonthly = count * modulePrice;
  const alacarteYearly = alacarteMonthly * 12;
  const bundleActive = alacarteMonthly > bundlePrice;
  const bundleYearly = bundlePrice * 12;
  const referenceYearly = bundleActive ? bundleYearly : alacarteYearly;
  const savings = Math.max(0, referenceYearly - annualPrice);

  let savingsLabel = "over continuing with separate individual monthly selections.";
  if (bundleActive) {
    savingsLabel = "over continuing with the Standard Monthly Bundle pricing.";
  }
  if (count <= 1 && savings === 0) {
    savingsLabel = "to unlock all five modules with Annual All-Access (full cross-market desk).";
  }

  return {
    alacarteMonthly,
    alacarteYearly,
    bundleYearly,
    bundleActive,
    referenceYearly,
    annualPrice,
    savings,
    savingsLabel,
  };
}

export function savingsPercent(referenceYearly: number, annualPrice: number): number {
  if (referenceYearly <= 0) return 0;
  return Math.round(((referenceYearly - annualPrice) / referenceYearly) * 100);
}
