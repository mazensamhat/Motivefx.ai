import { notFound } from "next/navigation";
import { ContentLayout, ContentProse } from "@/components/content/content-layout";
import { allFaqSlugs, getFaqBySlug } from "@/content/faq/items";
import { faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return allFaqSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFaqBySlug(slug);
  if (!f) return {};
  return pageMetadata({ title: f.question, description: f.answer.slice(0, 160), path: `/faq/${slug}` });
}

export default async function FaqDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = getFaqBySlug(slug);
  if (!f) notFound();

  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "FAQ", href: "/faq" },
        { name: f.question, href: `/faq/${slug}` },
      ]}
      title={f.question}
      kicker="FAQ"
      jsonLd={[faqJsonLd([f])]}
      cta={false}
    >
      <ContentProse>
        <p>{f.answer}</p>
      </ContentProse>
    </ContentLayout>
  );
}
