"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bitcoin,
  CircleDollarSign,
  LineChart,
  Target,
  Trophy,
} from "lucide-react";
import { PRICING_TIERS, type PricingTierId } from "@/lib/tiers";

const MODULES = [
  { id: "stocks", label: "Stocks", href: "/stocks", icon: LineChart, signal: 92 },
  { id: "crypto", label: "Crypto", href: "/crypto", icon: Bitcoin, signal: 81 },
  { id: "pink_slips", label: "Pink Slips", href: "/pink-sheets", icon: CircleDollarSign, signal: 74 },
  { id: "sports_betting", label: "Sports", href: "/sports", icon: Trophy, signal: 68 },
  { id: "prediction_markets", label: "Predictions", href: "/predictions", icon: Target, signal: 77 },
  { id: "options", label: "Options Flow", href: "/options", icon: Activity, signal: 85 },
] as const;

function tierLabel(tier: string) {
  return PRICING_TIERS.find((t) => t.id === tier)?.name ?? tier;
}

export function DashboardHome({
  email,
  tier,
  markets,
  hasSubscription,
}: {
  email: string;
  tier: string;
  markets: string[];
  hasSubscription: boolean;
}) {
  const firstName = email.split("@")[0] ?? "Trader";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <section className="app-hero-card">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[#00e676]">{greeting}, {firstName}</p>
            <h1 className="mt-2 text-3xl font-bold text-white">Intelligence Terminal</h1>
            <p className="mt-2 max-w-xl text-slate-400">
              Your AI chief of staff for market signals — stocks, crypto, sports, predictions, and pink sheets.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="app-badge">Plan: {tierLabel(tier as PricingTierId)}</span>
              {markets.length > 0 ? (
                markets.map((m) => (
                  <span key={m} className="app-badge app-badge-muted">
                    {m.replace(/_/g, " ")}
                  </span>
                ))
              ) : (
                <span className="app-badge app-badge-muted">No markets selected yet</span>
              )}
            </div>
          </div>
          <div className="app-signal-card shrink-0">
            <p className="text-xs uppercase tracking-wider text-slate-400">Top Motive Signal</p>
            <p className="mt-2 text-4xl font-bold text-[#00e676]">92</p>
            <p className="mt-1 text-lg font-semibold text-white">NVDA</p>
            <p className="text-sm text-slate-400">High confidence · Earnings momentum</p>
            <Link href="/stocks/nvda" className="app-inline-link mt-4 inline-flex items-center gap-1">
              <BarChart3 className="h-4 w-4" />
              Read research brief
            </Link>
          </div>
        </div>
      </section>

      {!hasSubscription && (
        <section className="app-upgrade-banner">
          <div>
            <p className="font-semibold text-white">Activate your intelligence markets</p>
            <p className="mt-1 text-sm text-slate-400">
              Choose a tier on pricing to unlock live signals, briefings, and portfolio intelligence.
            </p>
          </div>
          <Link href="/pricing" className="app-cta-btn">
            View plans
          </Link>
        </section>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Markets</h2>
          <Link href="/learn" className="text-sm text-[#00e676] hover:underline">
            Learning center
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.id} href={mod.href} className="app-module-card group">
                <div className="flex items-start justify-between gap-3">
                  <div className="app-module-icon">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="app-signal-pill">{mod.signal}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white group-hover:text-[#00e676]">
                  {mod.label}
                </h3>
                <p className="mt-1 text-sm text-slate-400">Open market intelligence hub</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="app-panel">
          <h3 className="font-semibold text-white">Today&apos;s briefing</h3>
          <p className="mt-2 text-sm text-slate-400">
            Overnight: unusual options flow in mega-cap tech, BTC exchange outflows, and two congressional
            disclosure clusters. Full live briefings roll out as data feeds connect in Phase 2.
          </p>
        </div>
        <div className="app-panel">
          <h3 className="font-semibold text-white">Portfolio radar</h3>
          <p className="mt-2 text-sm text-slate-400">
            Connect watchlists and holdings to personalize Motive Signal scores. Portfolio intelligence unlocks
            on Pro tier and above.
          </p>
          <Link href="/pricing" className="app-inline-link mt-3 inline-block">
            Upgrade for portfolio intel →
          </Link>
        </div>
      </section>
    </div>
  );
}
