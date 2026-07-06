import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentLayout, ContentProse } from "@/components/content/content-layout";
import { allGlossarySlugs, getGlossaryTerm } from "@/content/glossary/terms";
import { pageMetadata, faqJsonLd } from "@/lib/seo";

export function generateStaticParams() {
  return allGlossarySlugs().map((term) => ({ term }));
}

export async function generateMetadata({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  const t = getGlossaryTerm(term);
  if (!t) return {};
  return pageMetadata({
    title: t.term,
    description: t.definition,
    path: `/glossary/${term}`,
    type: "article",
  });
}

export default async function GlossaryTermPage({ params }: { params: Promise<{ term: string }> }) {
  const { term } = await params;
  const t = getGlossaryTerm(term);
  if (!t) notFound();

  const related = (t.related ?? [])
    .map((slug) => getGlossaryTerm(slug))
    .filter(Boolean)
    .map((r) => ({ label: r!.term, href: `/glossary/${r!.slug}` }));

  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Glossary", href: "/glossary" },
        { name: t.term, href: `/glossary/${term}` },
      ]}
      title={t.term}
      kicker="Glossary"
      description={t.definition}
      relatedLinks={related}
      jsonLd={[
        faqJsonLd([{ question: `What is ${t.term}?`, answer: t.definition + (t.extended ? ` ${t.extended}` : "") }]),
      ]}
    >
      <ContentProse>
        <p>{t.definition}</p>
        {t.extended && <p>{t.extended}</p>}
      </ContentProse>
    </ContentLayout>
  );
}
