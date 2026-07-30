import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { OPPORTUNITY_RADAR_DEMO } from "@/lib/marketing-copy";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Opportunity Radar™",
  description:
    "Opportunity Radar™ surfaces developing market situations with probability, evidence, analogues, beneficiaries, and confidence — predictive market intelligence from MotiveFX.",
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
      description="Find developing situations before they become headlines — ranked by probability, evidence, and who stands to benefit."
      relatedLinks={[
        { label: "Motive Signal methodology", href: "/motive-signal" },
        { label: "Product preview", href: "/demo" },
        { label: "Pricing", href: "/pricing" },
        { label: "Limitations", href: "/limitations" },
      ]}
    >
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
            <li>Signal detected — plain-English theme</li>
            <li>Probability and confidence</li>
            <li>Supporting evidence stack</li>
            <li>Historical analogue</li>
            <li>Potential beneficiaries</li>
            <li>Time horizon</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Example themes">
        <ContentProse>
          {OPPORTUNITY_RADAR_DEMO.map((card) => (
            <div key={card.theme} className="mb-8">
              <h3 className="text-lg font-semibold text-white">{card.theme}</h3>
              <p>
                Probability {card.probability}% · Confidence {card.confidence}% · {card.horizon}
              </p>
              <p className="text-slate-400">Analogue: {card.analogue}</p>
              <p>Beneficiaries: {card.beneficiaries.join(", ")}</p>
            </div>
          ))}
          <p>
            See it live in the{" "}
            <Link href="/demo">product preview</Link> or start on{" "}
            <Link href="/pricing">pricing</Link>.
          </p>
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
