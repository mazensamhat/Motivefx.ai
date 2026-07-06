import { notFound } from "next/navigation";
import Link from "next/link";
import { ContentLayout, ContentProse } from "@/components/content/content-layout";
import { pageMetadata } from "@/lib/seo";

const LABELS: Record<string, string> = {
  "position-size-calculator": "Position Size Calculator",
  "risk-calculator": "Risk Calculator",
  "portfolio-diversification": "Portfolio Diversification Checker",
  "options-profit-calculator": "Options Profit Calculator",
  "earnings-calendar": "Earnings Calendar",
  "market-hours": "Market Hours Countdown",
};

export function generateStaticParams() {
  return Object.keys(LABELS).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = LABELS[slug] ?? "Tool";
  return pageMetadata({
    title,
    description: `${title} — free MotiveFX market tool.`,
    path: `/tools/${slug}`,
  });
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const title = LABELS[slug];
  if (!title) notFound();

  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Tools", href: "/tools" },
        { name: title, href: `/tools/${slug}` },
      ]}
      title={title}
      kicker="Tool"
      description="Interactive tool launching with dashboard. Bookmark this page — full calculator ships next."
    >
      <ContentProse>
        <p>
          This tool page is live for SEO and internal linking. The interactive calculator will embed
          here from the MotiveFX terminal.{" "}
          <Link href="/pricing">Start free trial</Link> for full platform access.
        </p>
      </ContentProse>
    </ContentLayout>
  );
}
