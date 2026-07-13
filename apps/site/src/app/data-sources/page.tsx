import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { DATA_SOURCES } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Data Sources",
  description:
    "Where MotiveFX market intelligence comes from — Finnhub, CoinStats, The Odds API, Polymarket, OpenAI — plus clearly labeled demo modules.",
  path: "/data-sources",
});

const STATUS_LABEL: Record<(typeof DATA_SOURCES)[number]["status"], string> = {
  live: "Live / configured",
  demo: "Demo / simulated",
  infra: "Infrastructure",
};

export default function DataSourcesPage() {
  const live = DATA_SOURCES.filter((s) => s.status === "live" || s.status === "infra");
  const demo = DATA_SOURCES.filter((s) => s.status === "demo");

  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Data sources", href: "/data-sources" },
      ]}
      title="Data sources & methodology"
      kicker="Transparency"
      description="Trust signal for users and search engines. We document where information originates — and what is still simulated."
      relatedLinks={[
        { label: "Motive Signal methodology", href: "/motive-signal" },
        { label: "Research team", href: "/research-team" },
        { label: "Product preview", href: "/demo" },
      ]}
    >
      <ContentSection title="Primary feeds">
        <ContentProse>
          <p>
            Production market data is wired through the providers below when the matching API keys
            are configured (see <code>/api/health</code>). Without keys, MotiveFX falls back to
            realistic sample payloads so the terminal remains usable in demo mode.
          </p>
        </ContentProse>
        <ul className="content-list check-list">
          {live.map((s) => (
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
            These panels ship with curated sample data so you can evaluate the product UX. They are{" "}
            <strong>not</strong> live exchange, congressional, or sportsbook feeds. We do not claim
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
            Feeds are normalized, timestamped, and combined with AI summarization. Motive Signal scores
            reflect multi-source confluence when live inputs are present — never a single headline.
            Informational research only; not investment, trading, or betting advice.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
