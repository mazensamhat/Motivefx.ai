import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Motive Signal Methodology",
  description:
    "How Motive Signal™ works — multi-factor confidence scoring, limitations, and an honest preliminary hit-rate framework. Informational only.",
  path: "/motive-signal",
});

export default function MotiveSignalPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Motive Signal", href: "/motive-signal" },
      ]}
      title="Motive Signal™ methodology"
      kicker="Transparency"
      description="How we score confluence, what Motive Signal is not, and how we will publish track record as samples mature."
      relatedLinks={[
        { label: "Data sources", href: "/data-sources" },
        { label: "Product preview", href: "/demo" },
        { label: "Topic overview", href: "/topics/motive-signal" },
        { label: "Pricing", href: "/pricing" },
      ]}
    >
      <ContentSection title="What Motive Signal is">
        <ContentProse>
          <p>
            Motive Signal is a proprietary <strong>0–100 confidence score</strong> that ranks how strongly
            multiple factors agree <em>right now</em>. It answers: “Given the feeds we have, how strong is
            the confluence?” — so you research high-alignment ideas first.
          </p>
          <p>
            It is <strong>not</strong> a buy/sell rating, price target, probability of profit, or personalized
            investment or betting advice. Past patterns are not forecasts of future results.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Methodology (high level)">
        <ContentProse>
          <ol className="content-list">
            <li>
              <strong>Ingest</strong> — Normalize live and archived inputs (prices, volume, flow proxies,
              odds/line context, prediction-market prices, filings when available) with timestamps and source tags.
            </li>
            <li>
              <strong>Detect</strong> — Flag anomalies such as relative volume spikes, unusual options-style
              activity (demo-labeled when simulated), whale/volume proxies, line moves, and narrative shifts.
            </li>
            <li>
              <strong>Score</strong> — Weight module-specific factors into a composite 0–100 Motive Signal with
              a plain-English Why It Matters summary (LLM layer when OpenAI is configured).
            </li>
            <li>
              <strong>Prioritize</strong> — Surfaces in the terminal radar and briefs so operators triage research —
              not execute trades or place bets inside MotiveFX.
            </li>
          </ol>
          <p>
            Factor detail expands by plan (Decision History and advanced analytics on Ultra+). See{" "}
            <Link href="/pricing">pricing</Link> and <Link href="/data-sources">data sources</Link> for what is
            live vs demo.
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Limitations">
        <ContentProse>
          <ul className="content-list">
            <li>Scores depend on available feeds; demo modules use sample data and must not be treated as live tape.</li>
            <li>LLM explanations can err; always verify critical facts against primary sources.</li>
            <li>High scores can coincide with crowded or late moves — confluence ≠ edge.</li>
            <li>Sports and prediction modules are analytics-only; geo and age restrictions may apply.</li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Hit-rate & historical accuracy">
        <ContentProse>
          <p>
            <strong>Status: preliminary / limited sample.</strong> We do not publish fabricated win rates or
            “guaranteed” accuracy. A formal backtest and live forward-test framework is in progress.
          </p>
          <p>How we will measure (and what you should expect in early releases):</p>
          <ul className="content-list">
            <li>
              <strong>Definition</strong> — For equities, a scored event is a “hit” if the directional bias of the
              Why It Matters summary aligns with forward return over a pre-declared horizon (e.g. 1–5 sessions),
              after excluding demo-only samples.
            </li>
            <li>
              <strong>Coverage</strong> — Early track record will cover live-feed modules only (Finnhub / crypto /
              odds / Polymarket where keyed), with sample size and date range disclosed.
            </li>
            <li>
              <strong>Disclosure</strong> — Until N is large enough for statistical confidence, we label results{" "}
              <em>preliminary</em> and avoid headline percentages on marketing pages.
            </li>
            <li>
              <strong>What exists today</strong> — Decision History (Ultra+) is the product surface for journaling
              outcomes; public aggregate hit-rate tables will ship here when methodology lock + sample size allow.
            </li>
          </ul>
          <p>
            If you need the current sample status for diligence, email{" "}
            <a href="mailto:support@motivefx.ai">support@motivefx.ai</a> with subject “Motive Signal track record.”
          </p>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Informational only">
        <ContentProse>
          <p>
            MotiveFX.AI provides market intelligence software. We do not execute trades, accept wagers, custody
            funds, or act as a broker, adviser, or sportsbook. Read our{" "}
            <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link>.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
