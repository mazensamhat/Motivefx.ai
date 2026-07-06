import { notFound } from "next/navigation";
import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { allModuleSlugs, getModule } from "@/content/modules";

export function generateStaticParams() {
  return allModuleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getModule(slug);
  if (!content) return {};
  return entityMetadata(content, `/markets/${slug}`);
}

export default async function MarketModulePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getModule(slug);
  if (!content) notFound();

  return (
    <EntityPageView
      content={content}
      path={`/markets/${slug}`}
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Markets", href: "/markets/stocks" },
        { name: content.title, href: `/markets/${slug}` },
      ]}
    />
  );
}
