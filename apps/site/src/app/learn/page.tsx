import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LEARN_ARTICLES } from "@/content/learn";
import { LEARN_CATEGORIES } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Learning Center",
  description:
    "Learn MotiveFX products — stocks, crypto, options, prediction markets, sports betting, pink slips — plus AI investing and market psychology.",
  path: "/learn",
});

function guideCount(category: string) {
  return Object.values(LEARN_ARTICLES).filter((a) => a.category === category).length;
}

export default function LearnHubPage() {
  return (
    <MarketingShell>
      <div className="hub-page">
        <header className="hub-header">
          <p className="section-kicker">Learning center</p>
          <h1>Teach first. Authority follows.</h1>
          <p className="section-desc">
            Product guides for every MotiveFX market module — plus core skills in AI investing, flow, and
            psychology. Educational only; not financial advice.
          </p>
        </header>
        <ul className="hub-grid">
          {LEARN_CATEGORIES.map((c) => {
            const n = guideCount(c.slug);
            return (
              <li key={c.slug}>
                <Link href={c.href} className="hub-card">
                  <h2>{c.label}</h2>
                  <p>
                    {n} guide{n === 1 ? "" : "s"} · explainers and use cases →
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </MarketingShell>
  );
}
