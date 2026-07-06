import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { allCompareSlugs, getCompare } from "@/content/compare";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "MotiveFX Comparisons",
  description: "Compare MotiveFX to TradingView, Yahoo Finance, Seeking Alpha, Benzinga, and more.",
  path: "/compare",
});

export default function CompareHubPage() {
  return (
    <MarketingShell>
      <div className="hub-page">
        <header className="hub-header">
          <p className="section-kicker">Compare</p>
          <h1>MotiveFX vs the market</h1>
          <p className="section-desc">Comparison pages rank well and help users choose the right stack.</p>
        </header>
        <ul className="hub-grid">
          {allCompareSlugs().map((slug) => {
            const c = getCompare(slug)!;
            return (
              <li key={slug}>
                <Link href={`/compare/${slug}`} className="hub-card">
                  <h2>{c.title}</h2>
                  <p>{c.lead}</p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </MarketingShell>
  );
}
