export const MODULE_CATALOG = {
  trades: {
    name: "Trades",
    tagline: "Holdings intel + unusual options + congress flow",
    price: 29,
    features: ["Holdings signal context", "Unusual options scanner", "Congress & insider signals"],
  },
  crypto: {
    name: "Crypto",
    tagline: "Wallet intelligence + prediction markets + holdings intel",
    price: 29,
    features: ["Crypto holdings tracker", "Whale & trending alerts", "Polymarket odds feed"],
  },
  betting: {
    name: "Betting",
    tagline: "Line moves + sharp money + bet grader",
    price: 29,
    features: ["Track your bets", "AI signal research", "Sharp vs public splits"],
  },
  penny: {
    name: "Pink Slips",
    tagline: "Penny stock scanner + pink slip holdings intel",
    price: 29,
    features: ["Sub-$5 signal scanner", "Informational signal context on pink slips", "Volume spike alerts"],
  },
  predictions: {
    name: "Predictions",
    tagline: "War, politics, celebrity & event markets (Polymarket-style)",
    price: 29,
    features: ["Geopolitics & war markets", "Celebrity / marriage bets", "AI odds analysis"],
  },
} as const;

export const ANNUAL_PRICE_USD = 799;
export const BUNDLE_PRICE_USD = 109;
