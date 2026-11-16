import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { DATA_SOURCES } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";

export const metadata = pageMetadata({
  title: "Data Sources",
  description:
    "Where MotiveFX market intelligence comes from — Finnhub, CoinStats, The Odds API, Polymarket, OpenAI — plus clearly labeled demo modules.",
  path: "/data-sources",
});

const STATUS_LABEL: Record<(typeof DATA_SOURCES)[number]["status"], string> = {
  integrated: "Integrated source",
  derived: "Derived indicator",
  demo: "Demo / simulated",
  infra: "Infrastructure",
};

export default function DataSourcesPage() {
  const integrations = DATA_SOURCES.filter((s) => s.status !== "demo");
  const demo = DATA_SOURCES.filter((s) => s.status === "demo");

  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Data sources", href: "/data-sources" },
      ]}
      title="Data sources & methodology"
      kicker="Transparency"
      description="Where our information comes from, how it is interpreted, and which coverage is still demonstration-only."
      relatedLinks={[
        { label: "Motive Signal methodology", href: "/motive-signal" },
        { label: "Research team", href: "/research-team" },
        { label: "Product preview", href: "/demo" },
      ]}
    >
      <ContentSection title="Source integrations">
        <ContentProse>
          <p>
            This catalog describes the integrations in MotiveFX. An integrated source does not
            establish that every market or provider is available right now. Review source labels
            and timestamps in the terminal, and check the <Link href="/status">service status</Link>
            {" "}for current operational issues. Missing or stale production evidence remains
            unavailable or limited; demonstration content is labeled separately.
          </p>
        </ContentProse>
        <ul className="content-list check-list">
          {integrations.map((s) => (
            <li key={s.name}>
              <strong>{s.name}</strong>
              <span className="ml-2 text-xs uppercase tracking-wide text-emerald-400/90">
                {STATUS_LABEL[s.status]}
              </span>
              <p className="mt-1 text-sm text-slate-400">{s.detail}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="Demo / limited modules">
        <ContentProse>
          <p>
            These feature areas have demonstration data for exploring the product. They do not have
            verified live coverage in production. We do not claim
            Polygon, CBOE, Tradier, or SEC EDGAR as wired sources today.
          </p>
        </ContentProse>
        <ul className="content-list check-list">
          {demo.map((s) => (
            <li key={s.name}>
              <strong>{s.name}</strong>
              <span className="ml-2 text-xs uppercase tracking-wide text-amber-400/90">
                {STATUS_LABEL[s.status]}
              </span>
              <p className="mt-1 text-sm text-slate-400">{s.detail}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="How we use data">
        <ContentProse>
          <p>
            Feeds are attributed, timestamped, and combined with AI summarization. Motive Signal scores
            summarize available evidence. Evidence confidence and source freshness are separate from
            the score; a score is not a calibrated forecast probability.
            Informational research only; not investment, trading, or betting advice.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
