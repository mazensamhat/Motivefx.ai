import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site-config";
import { allAiSlugs } from "@/content/ai/pages";
import { allCompareSlugs } from "@/content/compare";
import { allDailySlugs } from "@/content/daily/pages";
import { allFaqSlugs } from "@/content/faq/items";
import { allGlossarySlugs } from "@/content/glossary/terms";
import { allLearnCategorySlugs } from "@/content/learn";
import { allMetricSlugs } from "@/content/metrics/terms";
import { allModuleSlugs } from "@/content/modules";
import { allStockTickers } from "@/content/stocks/tickers";
import { allTopicSlugs } from "@/content/topics";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE.url;
  const staticPages = [
    "",
    "/pricing",
    "/learn",
    "/compare",
    "/glossary",
    "/faq",
    "/why-motivefx",
    "/data-sources",
    "/research-team",
    "/tools",
    "/privacy",
  ];

  const urls: MetadataRoute.Sitemap = staticPages.map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.8,
  }));

  const add = (paths: string[], priority = 0.7) => {
    for (const path of paths) {
      urls.push({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: "weekly", priority });
    }
  };

  add(["/stocks", "/crypto", "/options", "/predictions", "/sports", "/pink-sheets"], 0.95);
  add(allModuleSlugs().map((s) => `/markets/${s}`), 0.85);
  add(allTopicSlugs().map((s) => `/topics/${s}`), 0.85);
  add(allStockTickers().map((t) => `/stocks/${t}`), 0.75);
  add(allDailySlugs().map((s) => `/daily/${s}`), 0.9);
  add(allCompareSlugs().map((s) => `/compare/${s}`), 0.8);
  add(allGlossarySlugs().map((s) => `/glossary/${s}`), 0.6);
  add(allFaqSlugs().map((s) => `/faq/${s}`), 0.65);
  add(allAiSlugs().map((s) => `/ai/${s}`), 0.85);
  add(allMetricSlugs().map((s) => `/metrics/${s}`), 0.7);
  add(allLearnCategorySlugs().map((c) => `/learn/${c}`), 0.8);

  return urls;
}
