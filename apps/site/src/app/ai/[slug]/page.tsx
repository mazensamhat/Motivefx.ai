import { notFound } from "next/navigation";
import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { allAiSlugs, getAiPage } from "@/content/ai/pages";

export function generateStaticParams() {
  return allAiSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getAiPage(slug);
  if (!content) return {};
  return entityMetadata(content, `/ai/${slug}`);
}

export default async function AiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getAiPage(slug);
  if (!content) notFound();

  return (
    <EntityPageView
      content={content}
      path={`/ai/${slug}`}
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "AI", href: "/ai/how-motive-signal-works" },
        { name: content.title, href: `/ai/${slug}` },
      ]}
    />
  );
}
