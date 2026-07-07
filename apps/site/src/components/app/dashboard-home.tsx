"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bitcoin,
  CircleDollarSign,
  LineChart,
  Lock,
  Target,
  Trophy,
} from "lucide-react";
import { PRICING_TIERS, type IntelligenceMarketId, type PricingTierId } from "@/lib/tiers";
import { userHasLiveMarketAccess } from "@/lib/entitlements";

const MODULES = [
  { id: "stocks" as const, marketId: "stocks" as IntelligenceMarketId, label: "Stocks", href: "/app/markets/stocks", icon: LineChart, signal: 92 },
  { id: "crypto" as const, marketId: "crypto" as IntelligenceMarketId, label: "Crypto", href: "/app/markets/crypto", icon: Bitcoin, signal: 81 },
  { id: "pink_slips" as const, marketId: "pink_slips" as IntelligenceMarketId, label: "Pink Slips", href: "/app/markets/pink-slips", icon: CircleDollarSign, signal: 74 },
  { id: "sports_betting" as const, marketId: "sports_betting" as IntelligenceMarketId, label: "Sports", href: "/app/markets/sports", icon: Trophy, signal: 68 },
  { id: "prediction_markets" as const, marketId: "prediction_markets" as IntelligenceMarketId, label: "Predictions", href: "/app/markets/predictions", icon: Target, signal: 77 },
  { id: "options" as const, marketId: "options" as const, label: "Options Flow", href: "/app/markets/options", icon: Activity, signal: 85 },
];

function tierLabel(tier: string) {
  return PRICING_TIERS.find((t) => t.id === tier)?.name ?? tier;
}

export function DashboardHome({
  email,
  tier,
  markets,
  hasSubscription,
  briefing,
  backendConnected,
}: {
  email: string;
  tier: string;
  markets: IntelligenceMarketId[];
  hasSubscription: boolean;
  briefing: Record<string, unknown> | null;
  backendConnected: boolean;
}) {
  const firstName = email.split("@")[0] ?? "Trader";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const opportunities = (briefing?.opportunities as { symbol?: string; confidence?: number; title?: string }[] | undefined) ?? [];
  const top = opportunities[0];
  const tagline = (briefing?.tagline as string | undefined) ?? "Your AI chief of staff for market signals.";
  const greetingText = (briefing?.greeting as string | undefined) ?? `${greeting}, ${firstName}`;

  return (
    <div className="space-y-6">
      {!backendConnected && (
        <section className="app-upgrade-banner border-amber-500/40">
          <div>
            <p className="font-semibold text-white">Backend tools offline</p>
            <p className="mt-1 text-sm text-slate-400">
              Start FastAPI: <code className="text-[#00e676]">uvicorn main:app --port 8001</code> in{" "}
              <code className="text-slate-300">backend/</code> and set{" "}
              <code className="text-slate-300">BACKEND_SYNC_SECRET</code> in env.
            </p>
          </div>
        </section>
      )}

      <section className="app-hero-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#00e676]">{greetingText}</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Intelligence Terminal</h1>
            <p className="mt-2 max-w-xl text-slate-400">{tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="app-badge">Plan: {tierLabel(tier as PricingTierId)}</span>
              {markets.length > 0 ? (
                markets.map((m) => (
                  <span key={m} className="app-badge app-badge-muted">
                    {m.replace(/_/g, " ")}
                  </span>
                ))
              ) : (
                <span className="app-badge app-badge-muted">Preview on all markets</span>
              )}
            </div>
            <Link href="/app/settings" className="app-inline-link mt-4 inline-block">
              Account, password & feedback →
            </Link>
          </div>
          <div className="app-signal-card shrink-0">
            <p className="text-xs uppercase tracking-wider text-slate-400">Top Motive Signal</p>
            <p className="mt-2 text-4xl font-bold text-[#00e676]">{top?.confidence ?? 92}</p>
            <p className="mt-1 text-lg font-semibold text-white">{top?.symbol ?? "NVDA"}</p>
            <p className="text-sm text-slate-400">{top?.title ?? "High confidence · Earnings momentum"}</p>
            <Link href="/app/markets/stocks" className="app-inline-link mt-4 inline-flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Open stocks terminal
            </Link>
          </div>
        </div>
      </section>

      {!hasSubscription && (
        <section className="app-upgrade-banner">
          <div>
            <p className="font-semibold text-white">Unlock live intelligence</p>
            <p className="mt-1 text-sm text-slate-400">
              Preview mode is active. Subscribe to unlock live feeds on your plan.
            </p>
          </div>
          <Link href="/pricing" className="app-cta-btn">
            View plans
          </Link>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your markets</h2>
          <Link href="/app/settings" className="text-sm text-[#00e676] hover:underline">
            Account
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const live = userHasLiveMarketAccess(tier, markets, mod.marketId, hasSubscription);
            return (
              <Link key={mod.id} href={mod.href} className="app-module-card group">
                <div className="flex items-start justify-between gap-3">
                  <div className="app-module-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-2">
                    {!live && <Lock className="h-3.5 w-3.5 text-slate-500" aria-hidden />}
                    <span className="app-signal-pill">{mod.signal}</span>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-[#00e676]">
                  {mod.label}
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  {live ? "Live · Open terminal" : "Preview · Subscribe for live"}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {opportunities.length > 1 && (
        <section className="app-panel">
          <h3 className="font-semibold text-white">Live opportunities</h3>
          <ul className="mt-3 space-y-2">
            {opportunities.slice(0, 5).map((o, i) => (
              <li key={`${o.symbol}-${i}`} className="app-signal-row">
                <div>
                  <p className="font-semibold text-white">{o.symbol}</p>
                  <p className="text-sm text-slate-400">{o.title}</p>
                </div>
                <span className="app-signal-pill">{o.confidence}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
