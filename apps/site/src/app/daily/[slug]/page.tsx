import { notFound } from "next/navigation";
import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { allDailySlugs, getDaily } from "@/content/daily/pages";

export function generateStaticParams() {
  return allDailySlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getDaily(slug);
  if (!content) return {};
  return entityMetadata(content, `/daily/${slug}`);
}

export default async function DailyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getDaily(slug);
  if (!content) notFound();

  return (
    <EntityPageView
      content={content}
      path={`/daily/${slug}`}
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Daily", href: "/daily/biggest-movers" },
        { name: content.title, href: `/daily/${slug}` },
      ]}
    />
  );
}
