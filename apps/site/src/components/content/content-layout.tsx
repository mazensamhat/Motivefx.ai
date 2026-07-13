import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { JsonLdScript } from "@/components/seo/json-ld";
import type { BreadcrumbItem, JsonLd } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/seo";
import { Button } from "@/components/ui/button";

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="breadcrumbs">
      {items.map((item, i) => (
        <span key={item.href}>
          {i > 0 && <span className="breadcrumb-sep">/</span>}
          {i === items.length - 1 ? (
            <span className="breadcrumb-current">{item.name}</span>
          ) : (
            <Link href={item.href}>{item.name}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}

export function ContentLayout({
  breadcrumbs,
  title,
  kicker,
  description,
  children,
  relatedLinks,
  faqs,
  jsonLd = [],
  cta = true,
}: {
  breadcrumbs: BreadcrumbItem[];
  title: string;
  kicker?: string;
  description?: string;
  children: React.ReactNode;
  relatedLinks?: { label: string; href: string }[];
  faqs?: { question: string; answer: string }[];
  jsonLd?: JsonLd[];
  cta?: boolean;
}) {
  const schemas: JsonLd[] = [breadcrumbJsonLd(breadcrumbs), ...jsonLd];

  return (
    <MarketingShell>
      <JsonLdScript data={schemas} />
      <article className="content-page">
        <header className="content-header">
          <div className="content-header-inner">
            <Breadcrumbs items={breadcrumbs} />
            {kicker && <p className="section-kicker">{kicker}</p>}
            <h1>{title}</h1>
            {description && <p className="content-lead">{description}</p>}
          </div>
        </header>

        <div className="content-body">
          <div className="content-main">{children}</div>

          {relatedLinks && relatedLinks.length > 0 && (
            <aside className="content-sidebar">
              <h2>Related</h2>
              <ul>
                {relatedLinks.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href}>{l.label}</Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>

        {faqs && faqs.length > 0 && (
          <section className="content-faq">
            <h2>Frequently asked questions</h2>
            <dl className="faq-list">
              {faqs.map((f) => (
                <div key={f.question} className="faq-item">
                  <dt>{f.question}</dt>
                  <dd>{f.answer}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {cta && (
          <section className="content-cta">
            <h2>Ready to research with context?</h2>
            <p>Start with a 7-day trial — pick your markets and open the intelligence terminal.</p>
            <Button href="/pricing" size="lg">
              Start free trial
            </Button>
          </section>
        )}
      </article>
    </MarketingShell>
  );
}

export function ContentSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="content-section">
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}

export function ContentProse({ children }: { children: React.ReactNode }) {
  return <div className="content-prose">{children}</div>;
}
