import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { LEARN_CATEGORIES } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Learning Center",
  description: "Learn AI investing, options flow, crypto, prediction markets, and market psychology with MotiveFX guides.",
  path: "/learn",
});

export default function LearnHubPage() {
  return (
    <MarketingShell>
      <div className="hub-page">
        <header className="hub-header">
          <p className="section-kicker">Learning center</p>
          <h1>Teach first. Authority follows.</h1>
          <p className="section-desc">
            Google and AI search love structured education. This hub becomes your biggest SEO asset over
            time.
          </p>
        </header>
        <ul className="hub-grid">
          {LEARN_CATEGORIES.map((c) => (
            <li key={c.slug}>
              <Link href={c.href} className="hub-card">
                <h2>{c.label}</h2>
                <p>Guides, explainers, and use cases →</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
