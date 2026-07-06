import { notFound } from "next/navigation";
import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { allCompareSlugs, getCompare } from "@/content/compare";
import { articleJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return allCompareSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getCompare(slug);
  if (!content) return {};
  return pageMetadata({ title: content.title, description: content.metaDescription, path: `/compare/${slug}`, type: "article" });
}

export default async function ComparePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getCompare(slug);
  if (!content) notFound();

  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Compare", href: "/compare" },
        { name: content.title, href: `/compare/${slug}` },
      ]}
      title={content.title}
      kicker="Comparison"
      description={content.lead}
      faqs={content.faqs}
      jsonLd={[
        articleJsonLd({ title: content.title, description: content.metaDescription, path: `/compare/${slug}`, datePublished: "2026-01-01" }),
        faqJsonLd(content.faqs),
      ]}
    >
      <ContentSection title="Where MotiveFX leads">
        <ul className="content-list check-list">
          {content.motivefxWins.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </ContentSection>
      <ContentSection title={`Where ${content.competitor} may lead`}>
        <ul className="content-list">
          {content.competitorWins.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      </ContentSection>
      {content.sections.map((s) => (
        <ContentSection key={s.heading} title={s.heading}>
          <ContentProse>
            {s.paragraphs.map((p) => (
              <p key={p.slice(0, 30)}>{p}</p>
            ))}
          </ContentProse>
        </ContentSection>
      ))}
      <p className="compare-more">
        <Link href="/compare">← All comparisons</Link>
      </p>
    </ContentLayout>
  );
}
