import { MarketingShell } from "@/components/marketing/marketing-shell";
import { GlossaryHub } from "@/components/content/glossary-hub";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Financial Glossary",
  description: "500+ financial terms explained — options flow, institutional buying, Motive Signal, and more.",
  path: "/glossary",
});

export default function GlossaryPage() {
  return (
    <MarketingShell>
      <div className="hub-page">
        <header className="hub-header">
          <p className="section-kicker">Glossary</p>
          <h1>Financial terms, explained</h1>
          <p className="section-desc">
            Become the Wikipedia of market intelligence. Each term links across modules, metrics, and
            research.
          </p>
        </header>
        <GlossaryHub />
      </div>
    </MarketingShell>
  );
}
