import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Methods & Limitations",
  description:
    "Honest limitations of MotiveFX engines — Motive Signal, Probability, Consensus Break, Future Simulator, and Market Genome. Informational market intelligence only.",
  path: "/limitations",
});

export default function LimitationsPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Limitations", href: "/limitations" },
      ]}
      title="Methods & limitations"
      kicker="Transparency"
      description="What our engines do, what they do not do, and how to use MotiveFX as research software — not as advice or a guarantee."
      relatedLinks={[
        { label: "Motive Signal methodology", href: "/motive-signal" },
        { label: "Data sources", href: "/data-sources" },
        { label: "Terms", href: "/terms" },
        { label: "Pricing", href: "/pricing" },
      ]}
    >
      <ContentSection title="Core principle">
        <ContentProse>
          <p>
            MotiveFX is an <strong>AI market intelligence platform</strong>. Named engines
            (Motive Signal™, Probability Engine, Consensus Break, Future Simulator, Market Genome)
            are research heuristics and ranked narratives — not certified forecasts, trading systems,
            or personalized advice.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="What the engines are">
        <ContentProse>
          <ul className="content-list">
            <li>
              <strong>Motive Signal™</strong> — confluence score from available factors; triage research,
              not buy/sell ratings.
            </li>
            <li>
              <strong>Probability views</strong> — multi-factor theme likelihoods for exploration; not
              calibrated market odds.
            </li>
            <li>
              <strong>Consensus Break</strong> — divergence between narrative/sentiment and tape proxies.
            </li>
            <li>
              <strong>Future Simulator</strong> — educational scenario branches from a seed event.
            </li>
            <li>
              <strong>Market Genome</strong> — structural fingerprints of how themes relate across markets.
            </li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Known limitations">
        <ContentProse>
          <ul className="content-list">
            <li>Outputs depend on live and archived feeds; demo or missing keys mean sample data.</li>
            <li>LLM explanations can hallucinate — verify critical facts against primary sources.</li>
            <li>High confluence can still be late, crowded, or wrong; confluence ≠ edge.</li>
            <li>Public hit-rate tables remain preliminary until sample size and methodology lock.</li>
            <li>Sports and prediction modules are analytics-only; geo/age rules may apply.</li>
            <li>API and institutional features are for research workflows — rate-limited and plan-gated.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="How to use MotiveFX well">
        <ContentProse>
          <p>
            Treat Daily Brief and Opportunity Radar as a morning research stack. Journal outcomes in
            Decision History (Ultra+). For methodology detail see{" "}
            <Link href="/motive-signal">Motive Signal</Link> and{" "}
            <Link href="/data-sources">data sources</Link>.
          </p>
          <p>
            We do not execute trades, accept wagers, custody funds, or act as a broker or adviser. Read
            our <Link href="/terms">Terms</Link>.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
