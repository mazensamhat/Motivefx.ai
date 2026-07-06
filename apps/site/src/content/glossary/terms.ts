import type { GlossaryTerm } from "../types";

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  { slug: "relative-volume", term: "Relative Volume", definition: "Current volume compared to average volume over a lookback period. RVOL above 2.0 often indicates unusual interest.", extended: "Traders use relative volume to filter breakouts from low-liquidity noise.", related: ["unusual-volume", "open-interest"] },
  { slug: "unusual-volume", term: "Unusual Volume", definition: "Volume that statistically exceeds recent norms for a security, often signaling institutional or informed activity.", related: ["relative-volume", "dark-pool"] },
  { slug: "open-interest", term: "Open Interest", definition: "Total outstanding derivative contracts that have not been settled. Rising OI with price can confirm trend participation.", related: ["options-flow", "gamma"] },
  { slug: "gamma", term: "Gamma", definition: "Rate of change of an option's delta. Dealer gamma exposure can amplify intraday moves near strikes.", related: ["open-interest", "implied-volatility"] },
  { slug: "implied-volatility", term: "Implied Volatility (IV)", definition: "Market-implied expectation of future volatility derived from option prices.", related: ["iv-crush", "options-flow"] },
  { slug: "iv-crush", term: "IV Crush", definition: "Sharp drop in implied volatility after a known event (e.g. earnings), often deflating option premiums.", related: ["implied-volatility", "earnings"] },
  { slug: "dark-pool", term: "Dark Pool", definition: "Private exchange where large orders execute without pre-trade visibility. Aggregated dark pool prints can hint at institutional activity.", related: ["institutional-buying", "unusual-volume"] },
  { slug: "whale-buying", term: "Whale Buying", definition: "Large-scale accumulation by wallets or accounts holding significant size, common in crypto and block equity trades.", related: ["institutional-buying"] },
  { slug: "options-flow", term: "Options Flow", definition: "Stream of options trades analyzed for size, urgency (sweeps), and direction relative to underlying price.", related: ["open-interest", "unusual-volume"] },
  { slug: "congress-trading", term: "Congress Trading", definition: "Stock transactions by members of U.S. Congress disclosed under STOCK Act rules, typically with reporting delays.", related: ["institutional-buying"] },
  { slug: "motive-signal", term: "Motive Signal", definition: "MotiveFX proprietary 0–100 confidence score combining multi-factor market intelligence. Informational, not investment advice.", related: ["market-intelligence"] },
  { slug: "prediction-market", term: "Prediction Market", definition: "Market where participants trade contracts paying on event outcomes, pricing implied probabilities.", related: ["implied-volatility"] },
  { slug: "funding-rate", term: "Funding Rate", definition: "Periodic payment between long and short perpetual swap traders reflecting market bias.", related: ["crypto"] },
  { slug: "earnings", term: "Earnings", definition: "Company-reported quarterly financial results. Events often drive volatility and repricing.", related: ["iv-crush"] },
  { slug: "institutional-buying", term: "Institutional Buying", definition: "Accumulation of shares by funds, banks, or other large regulated entities visible through filings and block data.", related: ["dark-pool", "whale-buying"] },
];

export function getGlossaryTerm(slug: string) {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}

export function allGlossarySlugs() {
  return GLOSSARY_TERMS.map((t) => t.slug);
}
