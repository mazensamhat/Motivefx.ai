import { LEARN_CATEGORIES } from "@/lib/site-config";
import type { EntityPageContent } from "../types";

export const LEARN_ARTICLES: Record<string, EntityPageContent & { category: string }> = {
  "what-is-ai-investing": {
    slug: "what-is-ai-investing",
    category: "ai-investing",
    title: "What is AI Investing?",
    metaDescription: "Introduction to AI investing — tools, limits, and how MotiveFX fits your research stack.",
    kicker: "AI Investing",
    lead: "AI investing uses machine learning and large language models to process market data faster than manual research.",
    sections: [
      { heading: "Tools vs advice", paragraphs: ["AI platforms like MotiveFX are research accelerators, not fiduciary advisors."] },
      { heading: "Human in the loop", paragraphs: ["The best outcomes combine AI speed with human judgment on sizing and risk."] },
    ],
    faqs: [],
    relatedLinks: [{ label: "How AI analyzes stocks", href: "/ai/how-ai-analyzes-stocks" }],
  },
  "reading-options-flow": {
    slug: "reading-options-flow",
    category: "options-flow",
    title: "How to Read Options Flow",
    metaDescription: "Beginner guide to unusual options activity and flow interpretation.",
    kicker: "Options Flow",
    lead: "Options flow shows where capital bets on direction, volatility, or hedging.",
    sections: [{ heading: "Sweeps vs blocks", paragraphs: ["Sweeps hit multiple exchanges quickly; blocks are large negotiated prints."] }],
    faqs: [],
    relatedLinks: [{ label: "Options module", href: "/markets/options" }],
  },
};

export function getLearnCategory(slug: string): EntityPageContent | undefined {
  const cat = LEARN_CATEGORIES.find((c) => c.slug === slug);
  if (!cat) return undefined;
  const articles = Object.values(LEARN_ARTICLES).filter((a) => a.category === slug);
  return {
    slug,
    title: cat.label,
    metaDescription: `Learn ${cat.label.toLowerCase()} — guides, explainers, and MotiveFX education.`,
    kicker: "Learning center",
    lead: `Educational guides on ${cat.label.toLowerCase()}. We teach first — authority follows.`,
    sections: [
      {
        heading: "Articles in this track",
        paragraphs: [
          articles.length
            ? `Explore ${articles.length} guide(s) in ${cat.label}. New content publishes weekly.`
            : "New guides publishing weekly. Subscribe to the newsletter for updates.",
        ],
      },
    ],
    faqs: [],
    relatedLinks: articles.map((a) => ({ label: a.title, href: `/learn/${slug}/${a.slug}` })),
  };
}

export function allLearnCategorySlugs() {
  return LEARN_CATEGORIES.map((c) => c.slug);
}
