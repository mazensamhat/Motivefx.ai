import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Research Team & Editorial Process",
  description: "MotiveFX research team, AI research pipeline, fact checking, and editorial standards.",
  path: "/research-team",
});

export default function ResearchTeamPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Research team", href: "/research-team" },
      ]}
      title="Research team & editorial process"
      kicker="Authors"
      description="Content is not anonymous. Our pipeline combines human editorial standards with AI augmentation."
      relatedLinks={[
        { label: "Data sources", href: "/data-sources" },
        { label: "How AI analyzes stocks", href: "/ai/how-ai-analyzes-stocks" },
        { label: "Why MotiveFX", href: "/why-motivefx" },
      ]}
    >
      <ContentSection title="Teams">
        <ul className="content-list">
          <li>
            <strong>Market Intelligence</strong> — signal detection, daily briefs, module coverage
          </li>
          <li>
            <strong>AI Research</strong> — RAG pipeline, Motive Signal methodology, Ask Motive AI
          </li>
          <li>
            <strong>Editorial</strong> — fact checking, disclosure standards, glossary & learning center
          </li>
        </ul>
      </ContentSection>
      <ContentSection title="Fact checking">
        <ContentProse>
          <p>
            AI drafts are grounded in retrieved data with source timestamps. Human review on flagship
            research and methodology pages. Not financial advice — informational intelligence only.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
