import { notFound } from "next/navigation";
import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { allLearnArticleParams, getLearnArticle } from "@/content/learn";

export function generateStaticParams() {
  return allLearnArticleParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const content = getLearnArticle(category, slug);
  if (!content) return {};
  return entityMetadata(content, `/learn/${category}/${slug}`);
}

export default async function LearnArticlePage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const content = getLearnArticle(category, slug);
  if (!content) notFound();

  return (
    <EntityPageView
      content={content}
      path={`/learn/${category}/${slug}`}
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Learn", href: "/learn" },
        { name: content.kicker || category, href: `/learn/${category}` },
        { name: content.title, href: `/learn/${category}/${slug}` },
      ]}
    />
  );
}
