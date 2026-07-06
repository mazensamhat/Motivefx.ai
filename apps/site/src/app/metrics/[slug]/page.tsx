import { notFound } from "next/navigation";
import { EntityPageView, entityMetadata } from "@/components/content/entity-page-view";
import { allMetricSlugs, getMetric } from "@/content/metrics/terms";

export function generateStaticParams() {
  return allMetricSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getMetric(slug);
  if (!content) return {};
  return entityMetadata(content, `/metrics/${slug}`);
}

export default async function MetricPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const content = getMetric(slug);
  if (!content) notFound();

  return (
    <EntityPageView
      content={content}
      path={`/metrics/${slug}`}
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Metrics", href: "/glossary" },
        { name: content.title, href: `/metrics/${slug}` },
      ]}
    />
  );
}
