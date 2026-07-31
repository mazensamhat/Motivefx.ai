import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { OpportunityRadarBoard } from "@/components/marketing/opportunity-radar-board";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Opportunity Radar™",
  description:
    "Opportunity Radar™ surfaces developing market situations with signal score, drivers, beneficiaries, horizon, and confidence — predictive market intelligence from MotiveFX.",
  path: "/opportunity-radar",
});

export default function OpportunityRadarPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Opportunity Radar", href: "/opportunity-radar" },
      ]}
      title="Opportunity Radar™"
      kicker="Institutional intelligence surface"
      description="Find developing situations before they become headlines — ranked by signal strength, evidence, and who stands to benefit."
      relatedLinks={[
        { label: "Motive Signal methodology", href: "/motive-signal" },
        { label: "Product preview", href: "/demo" },
        { label: "Pricing", href: "/pricing" },
        { label: "Limitations", href: "/limitations" },
      ]}
    >
      <ContentSection title="Live preview">
        <OpportunityRadarBoard ctaHref="/demo" ctaLabel="Explore Signal Graph™" />
      </ContentSection>

      <ContentSection title="What it is">
        <ContentProse>
          <p>
            Opportunity Radar is not a scanner of tickers. It is a ranked map of{" "}
            <strong>emerging situations</strong> — themes forming across signals — so operators triage
            research the way an intelligence desk would.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="What each opportunity shows">
        <ContentProse>
          <ul className="content-list">
            <li>Signal score with status and delta</li>
            <li>Short situation description + sparkline</li>
            <li>Key drivers and top beneficiaries / affected assets</li>
            <li>Time horizon and confidence</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Informational only">
        <ContentProse>
          <p>
            Educational market intelligence — not advice, forecasts of profit, or trade execution. Read{" "}
            <Link href="/limitations">methods &amp; limitations</Link> and our{" "}
            <Link href="/terms">Terms</Link>.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
