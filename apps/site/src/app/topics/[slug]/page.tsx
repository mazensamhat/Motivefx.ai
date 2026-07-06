import { notFound } from "next/navigation";
import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { allTopicSlugs, getTopic } from "@/content/topics";

export function generateStaticParams() {
  return allTopicSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getTopic(slug);
  if (!content) return {};
  return entityMetadata(content, `/topics/${slug}`);
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getTopic(slug);
  if (!content) notFound();

  return (
    <EntityPageView
      content={content}
      path={`/topics/${slug}`}
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Topics", href: "/topics/market-intelligence" },
        { name: content.title, href: `/topics/${slug}` },
      ]}
    />
  );
}
