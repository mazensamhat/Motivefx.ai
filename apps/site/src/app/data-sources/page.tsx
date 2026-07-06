import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { DATA_SOURCES } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Data Sources",
  description: "Where MotiveFX market intelligence comes from — SEC, FINRA, exchanges, Polygon, and more.",
  path: "/data-sources",
});

export default function DataSourcesPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Data sources", href: "/data-sources" },
      ]}
      title="Data sources & methodology"
      kicker="Transparency"
      description="Trust signal for users and search engines. We document where information originates."
      relatedLinks={[
        { label: "Research team", href: "/research-team" },
        { label: "FAQ: data source", href: "/faq/what-is-your-data-source" },
      ]}
    >
      <ContentSection title="Primary sources">
        <ul className="content-list check-list">
          {DATA_SOURCES.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </ContentSection>
      <ContentSection title="How we use data">
        <ContentProse>
          <p>
            Feeds are normalized, timestamped, and combined with AI summarization. Motive Signal scores
            reflect multi-source confluence — never a single headline.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
