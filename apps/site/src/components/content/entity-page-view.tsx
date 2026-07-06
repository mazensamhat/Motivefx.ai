import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { articleJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";
import type { EntityPageContent } from "@/content/types";

export function entityMetadata(content: EntityPageContent, path: string) {
  return pageMetadata({
    title: content.title,
    description: content.metaDescription,
    path,
    type: "article",
  });
}

export function EntityPageView({
  content,
  breadcrumbs,
  path,
}: {
  content: EntityPageContent;
  breadcrumbs: { name: string; href: string }[];
  path: string;
}) {
  return (
    <ContentLayout
      breadcrumbs={breadcrumbs}
      title={content.title}
      kicker={content.kicker}
      description={content.lead}
      relatedLinks={content.relatedLinks}
      faqs={content.faqs}
      jsonLd={[
        articleJsonLd({
          title: content.title,
          description: content.metaDescription,
          path,
          datePublished: new Date().toISOString().slice(0, 10),
        }),
        ...(content.faqs.length ? [faqJsonLd(content.faqs)] : []),
      ]}
    >
      {content.useCases && content.useCases.length > 0 && (
        <ContentSection title="Use cases">
          <ul className="content-list">
            {content.useCases.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </ContentSection>
      )}

      {content.sections.map((s) => (
        <ContentSection key={s.heading} title={s.heading}>
          <ContentProse>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 40)}>{p}</p>
            ))}
          </ContentProse>
        </ContentSection>
      ))}
    </ContentLayout>
  );
}
