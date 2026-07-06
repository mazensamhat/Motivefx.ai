import Link from "next/link";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { pageMetadata } from "@/lib/seo";

const TOOLS = [
  { slug: "position-size-calculator", label: "Position size calculator", desc: "Size trades from risk budget and stop distance." },
  { slug: "risk-calculator", label: "Risk calculator", desc: "Portfolio risk at a glance." },
  { slug: "portfolio-diversification", label: "Portfolio diversification checker", desc: "Concentration and sector exposure." },
  { slug: "options-profit-calculator", label: "Options profit calculator", desc: "P/L scenarios for basic strategies." },
  { slug: "earnings-calendar", label: "Earnings calendar", desc: "Upcoming reports for watchlist names." },
  { slug: "market-hours", label: "Market hours countdown", desc: "US session open/close timer." },
];

export const metadata = pageMetadata({
  title: "Free Market Tools",
  description: "Position size, risk, options, and calendar tools from MotiveFX — linkable SEO assets.",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <MarketingShell>
      <div className="hub-page">
        <header className="hub-header">
          <p className="section-kicker">Tools</p>
          <h1>Interactive market tools</h1>
          <p className="section-desc">People link to tools. Each tool becomes a discovery entry point.</p>
        </header>
        <ul className="hub-grid">
          {TOOLS.map((t) => (
            <li key={t.slug}>
              <Link href={`/tools/${t.slug}`} className="hub-card">
                <h2>{t.label}</h2>
                <p>{t.desc}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </MarketingShell>
  );
}
