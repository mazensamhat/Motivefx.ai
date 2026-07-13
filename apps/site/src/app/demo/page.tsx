import Link from "next/link";
import { ArrowRight, Eye, Lock, Monitor, Shield } from "lucide-react";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { Button } from "@/components/ui/button";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Product Preview",
  description:
    "Explore MotiveFX without signing in — module walkthrough and read-only terminal demo. Informational market intelligence only.",
  path: "/demo",
});

const MODULES = [
  {
    title: "Home command center",
    body: "Daily briefing, Motive Signal highlights, and watchlist radar in one dark terminal shell.",
  },
  {
    title: "Stocks & pink sheets",
    body: "Activity scoops, unusual options (demo-labeled), and microcap movers for research triage.",
  },
  {
    title: "Crypto",
    body: "Whale-style volume proxies and 24/7 narrative context from CoinStats / CoinGecko when configured.",
  },
  {
    title: "Sports & predictions",
    body: "Line moves via The Odds API and Polymarket Gamma events — analytics only, no wagering.",
  },
];

export default function DemoPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Product preview", href: "/demo" },
      ]}
      title="Product preview"
      kicker="No login required"
      description="Walk the modules, then open a read-only sandboxed terminal. Your private portfolios and billing stay behind sign-in."
      relatedLinks={[
        { label: "Pricing", href: "/pricing" },
        { label: "Motive Signal", href: "/motive-signal" },
        { label: "Data sources", href: "/data-sources" },
      ]}
      cta={false}
    >
      <ContentSection title="Open the terminal (read-only demo)">
        <ContentProse>
          <p>
            Public demo URL:{" "}
            <Link href="/terminal/?demo=1">
              https://www.motivefxai.com/terminal/?demo=1
            </Link>
            . Also available at <Link href="/demo">/demo</Link> on this site.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button href="/terminal/?demo=1" size="lg" variant="green">
              Launch read-only terminal
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button href="/pricing" size="lg" variant="secondary">
              Start free trial
            </Button>
          </div>
          <ul className="mt-6 grid gap-3 sm:grid-cols-3">
            <li className="flex gap-2 text-sm text-slate-300">
              <Eye className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
              Browse all five markets with sandbox entitlements
            </li>
            <li className="flex gap-2 text-sm text-slate-300">
              <Lock className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
              No access to other users&apos; data or billing
            </li>
            <li className="flex gap-2 text-sm text-slate-300">
              <Shield className="h-4 w-4 shrink-0 text-brand-green" aria-hidden />
              Portfolio saves and advisor writes still require an account
            </li>
          </ul>
        </ContentProse>
      </ContentSection>

      <ContentSection title="Module walkthrough">
        <ul className="content-list">
          {MODULES.map((m) => (
            <li key={m.title}>
              <strong className="inline-flex items-center gap-2">
                <Monitor className="h-4 w-4 text-brand-green" aria-hidden />
                {m.title}
              </strong>
              <p className="mt-1 text-sm text-slate-400">{m.body}</p>
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection title="What you will see">
        <ContentProse>
          <p>
            Live providers (Finnhub, CoinStats, The Odds API, Polymarket, OpenAI) power panels when keys are
            configured. Options flow, congress, and sharp-money cards are explicitly{" "}
            <Link href="/data-sources">demo / simulated</Link> until dedicated vendors are wired.
          </p>
          <p>
            MotiveFX is informational research software — not a broker, exchange, or sportsbook.
          </p>
        </ContentProse>
      </ContentSection>
    </ContentLayout>
  );
}
