import type { EntityPageContent } from "../types";

export const METRICS: Record<string, EntityPageContent> = {
  "relative-volume": {
    slug: "relative-volume",
    title: "What is Relative Volume?",
    metaDescription: "Relative volume (RVOL) explained — definition, formula, and how traders use it on MotiveFX.",
    kicker: "Metric explained",
    lead: "Relative volume compares today's trading activity to a historical average — typically 10 or 30 sessions.",
    sections: [
      { heading: "Formula", paragraphs: ["RVOL = Current Volume / Average Volume over lookback period."] },
      { heading: "Interpretation", paragraphs: ["RVOL > 2.0 suggests unusual participation. Combine with price trend and flow for context."] },
    ],
    faqs: [],
    relatedLinks: [{ label: "Glossary: Relative Volume", href: "/glossary/relative-volume" }, { label: "Stocks module", href: "/markets/stocks" }],
  },
  "open-interest": {
    slug: "open-interest",
    title: "What is Open Interest?",
    metaDescription: "Open interest in options explained — definition and trading context.",
    kicker: "Metric explained",
    lead: "Open interest counts all outstanding option contracts not yet closed or exercised.",
    sections: [{ heading: "OI vs volume", paragraphs: ["Volume is daily activity; OI is cumulative positioning. Rising OI with trend can confirm participation."] }],
    faqs: [],
    relatedLinks: [{ label: "Options module", href: "/markets/options" }],
  },
  gamma: {
    slug: "gamma",
    title: "What is Gamma?",
    metaDescription: "Options gamma explained — dealer positioning and market impact.",
    kicker: "Metric explained",
    lead: "Gamma measures how quickly an option's delta changes as the underlying moves.",
    sections: [{ heading: "Dealer hedging", paragraphs: ["Negative gamma environments can amplify intraday swings near popular strikes."] }],
    faqs: [],
    relatedLinks: [{ label: "IV Crush", href: "/metrics/iv-crush" }],
  },
  "iv-crush": {
    slug: "iv-crush",
    title: "What is IV Crush?",
    metaDescription: "Implied volatility crush after earnings and events — explained.",
    kicker: "Metric explained",
    lead: "IV crush is the collapse in implied volatility after uncertainty resolves — common post-earnings.",
    sections: [{ heading: "Trading implication", paragraphs: ["Long options holders may lose premium even if direction is correct."] }],
    faqs: [],
    relatedLinks: [{ label: "Implied Volatility", href: "/glossary/implied-volatility" }],
  },
  "whale-buying": {
    slug: "whale-buying",
    title: "What is Whale Buying?",
    metaDescription: "Whale buying in crypto and equities — large accumulation signals.",
    kicker: "Metric explained",
    lead: "Whale buying refers to large wallets or block traders accumulating significant size.",
    sections: [{ heading: "Context required", paragraphs: ["Whales distribute too. Look for sustained accumulation vs one-off transfers."] }],
    faqs: [],
    relatedLinks: [{ label: "Institutional buying", href: "/topics/institutional-buying" }],
  },
};

export function getMetric(slug: string) {
  return METRICS[slug];
}

export function allMetricSlugs() {
  return Object.keys(METRICS);
}
