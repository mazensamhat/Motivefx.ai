import { notFound } from "next/navigation";
import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { allLearnCategorySlugs, getLearnCategory } from "@/content/learn";

export function generateStaticParams() {
  return allLearnCategorySlugs().map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const content = getLearnCategory(category);
  if (!content) return {};
  return entityMetadata(content, `/learn/${category}`);
}

export default async function LearnCategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const content = getLearnCategory(category);
  if (!content) notFound();

  return (
    <EntityPageView
      content={content}
      path={`/learn/${category}`}
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Learn", href: "/learn" },
        { name: content.title, href: `/learn/${category}` },
      ]}
    />
  );
}
