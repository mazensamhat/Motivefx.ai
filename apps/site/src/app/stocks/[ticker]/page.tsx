import { notFound } from "next/navigation";
import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { allStockTickers, getStock } from "@/content/stocks/tickers";
import { articleJsonLd, faqJsonLd, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return allStockTickers().map((ticker) => ({ ticker }));
}

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const s = getStock(ticker);
  if (!s) return {};
  return pageMetadata({
    title: `${s.name} (${s.ticker}) AI Analysis`,
    description: s.metaDescription,
    path: `/stocks/${ticker.toLowerCase()}`,
    type: "article",
  });
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params;
  const s = getStock(ticker);
  if (!s) notFound();

  const path = `/stocks/${ticker.toLowerCase()}`;

  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Stocks", href: "/stocks" },
        { name: s.ticker, href: path },
      ]}
      title={`${s.name} (${s.ticker}) AI Analysis`}
      kicker="Stock intelligence"
      description={s.lead}
      relatedLinks={[
        ...s.relatedTopics,
        ...s.relatedTickers.map((t) => ({ label: `${t} analysis`, href: `/stocks/${t.toLowerCase()}` })),
      ]}
      faqs={s.faqs}
      jsonLd={[
        articleJsonLd({ title: `${s.name} analysis`, description: s.metaDescription, path, datePublished: new Date().toISOString().slice(0, 10) }),
        faqJsonLd(s.faqs),
      ]}
    >
      {s.sections.map((sec) => (
        <ContentSection key={sec.heading} title={sec.heading}>
          <ContentProse>
            {sec.paragraphs.map((p) => (
              <p key={p.slice(0, 30)}>{p}</p>
            ))}
          </ContentProse>
        </ContentSection>
      ))}
      <ContentSection title="Related research">
        <ContentProse>
          <p>
            Open MotiveFX for live Motive Signal, options flow, and portfolio impact on {s.ticker}.{" "}
            <Link href="/pricing">Start free trial →</Link>
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
