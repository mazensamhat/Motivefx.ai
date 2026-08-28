"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Radio,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { OpsActivityFeed } from "@/components/admin/ops-activity-feed";
import { OpsChartsRow } from "@/components/admin/ops-charts-row";
import { OpsCommandAttention } from "@/components/admin/ops-command-attention";
import { OpsKpiCard } from "@/components/admin/ops-kpi-card";
import { OpsPageToolbar } from "@/components/admin/ops-page-toolbar";
import { PlatformMonitorPanel } from "@/components/admin/platform-monitor-panel";
import { adminGet, type AdminDashboard } from "@/lib/admin-api";
import { greetingForHour, displayNameFromEmail } from "@/lib/ops-display-name";

type SiteDashboard = { totalUsers: number };

type MarketTruthSummary = {
  dataMode: string;
  golden: { ok: boolean };
  contamination: { demoInSignal: number; syntheticInSignal: number };
};

type ProvidersSummary = {
  providers: { id: string; label: string; enabled: boolean }[];
};

const PROVIDER_MARKS = [
  { id: "vercel", label: "V", tone: "dark" },
  { id: "supabase", label: "S", tone: "green" },
  { id: "stripe", label: "St", tone: "purple" },
  { id: "resend", label: "R", tone: "blue" },
];

function heatmapDailyTotals(dash: AdminDashboard): number[] {
  const { days, cells } = dash.activityHeatmap;
  return days.map((day) => {
    let total = 0;
    for (const mod of Object.keys(cells)) {
      total += cells[mod]?.[day] ?? 0;
    }
    return total;
  });
}

function aggregateCountries(dash: AdminDashboard) {
  const map = new Map<string, number>();
  for (const row of dash.demographics.topLocations) {
    const key = row.country || "Unknown";
    map.set(key, (map.get(key) ?? 0) + row.c);
  }
  return [...map.entries()]
    .map(([country, c]) => ({ country, c }))
    .sort((a, b) => b.c - a.c);
}

export function OpsOverview({ adminEmail }: { adminEmail?: string }) {
  const [loading, setLoading] = useState(true);
  const [dash, setDash] = useState<AdminDashboard | null>(null);
  const [siteUsers, setSiteUsers] = useState(0);
  const [truth, setTruth] = useState<MarketTruthSummary | null>(null);
  const [providers, setProviders] = useState<ProvidersSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, siteRes, truthRes, provRes] = await Promise.all([
        adminGet<AdminDashboard>("/dashboard"),
        fetch("/api/admin/site-dashboard", { cache: "no-store" }),
        fetch("/api/admin/market-truth", { cache: "no-store" }),
        fetch("/api/admin/providers", { cache: "no-store" }),
      ]);
      setDash(dashRes);
      if (siteRes.ok) {
        const site = (await siteRes.json()) as SiteDashboard;
        setSiteUsers(site.totalUsers ?? 0);
      }
      if (truthRes.ok) setTruth((await truthRes.json()) as MarketTruthSummary);
      if (provRes.ok) setProviders((await provRes.json()) as ProvidersSummary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const usageSparkline = useMemo(
    () => (dash ? heatmapDailyTotals(dash) : []),
    [dash]
  );

  const usageTrend = useMemo(() => {
    if (usageSparkline.length < 2) return { text: "No change", tone: "neutral" as const };
    const prev = usageSparkline[usageSparkline.length - 2] ?? 0;
    const cur = usageSparkline[usageSparkline.length - 1] ?? 0;
    if (prev === 0 && cur === 0) return { text: "No change", tone: "neutral" as const };
    if (prev === 0) return { text: `+${cur} vs yesterday`, tone: "up" as const };
    const pct = Math.round(((cur - prev) / prev) * 100);
    if (pct === 0) return { text: "No change", tone: "neutral" as const };
    return {
      text: `${pct > 0 ? "+" : ""}${pct}% vs yesterday`,
      tone: pct > 0 ? ("up" as const) : ("down" as const),
    };
  }, [usageSparkline]);

  const displayName = adminEmail ? displayNameFromEmail(adminEmail) : "there";
  const greeting = greetingForHour();

  if (loading && !dash) {
    return <p className="ops-muted">Loading dashboard…</p>;
  }

  if (error && !dash) {
    return <p className="ops-error-banner">{error}</p>;
  }

  if (!dash) return null;

  const { kpis } = dash;
  const users = siteUsers || kpis.totalUsers;
  const disabledProviders = providers?.providers.filter((p) => !p.enabled).length ?? 0;
  const truthOk =
    truth?.golden.ok &&
    (truth?.contamination.demoInSignal ?? 0) === 0 &&
    (truth?.contamination.syntheticInSignal ?? 0) === 0;
  const countries = aggregateCountries(dash);

  return (
    <section className="ops-page">
      <header className="ops-welcome-header">
        <div>
          <h1>
            {greeting}, {displayName}! 👋
          </h1>
          <p>Here&apos;s what&apos;s happening with MotiveFX today.</p>
        </div>
        <OpsPageToolbar adminEmail={adminEmail} />
      </header>

      {error ? <p className="ops-error-banner">{error}</p> : null}

      <OpsCommandAttention />

      <div className="ops-kpi-row">
        <OpsKpiCard
          label="Site Users"
          value={users}
          icon={Users}
          sparkline={usageSparkline.length ? usageSparkline : [users, users]}
          sparkColor="#00c853"
          trend={users > 0 ? `${users} total` : "No change"}
          trendTone="neutral"
        />
        <OpsKpiCard
          label="Paying Accounts"
          value={kpis.activeModuleSubscriptions}
          icon={BarChart3}
          sparkline={[kpis.activeModuleSubscriptions, kpis.activeModuleSubscriptions]}
          sparkColor="#42a5f5"
        />
        <OpsKpiCard
          label="Est. MRR"
          value={`$${kpis.estimatedMrrUsd.toLocaleString()}`}
          icon={Wallet}
          sparkline={[kpis.estimatedMrrUsd, kpis.estimatedMrrUsd]}
          sparkColor="#ff9800"
        />
        <OpsKpiCard
          label="Usage (24H)"
          value={kpis.usageEvents24h}
          icon={Activity}
          sparkline={usageSparkline.length ? usageSparkline : [kpis.usageEvents24h, kpis.usageEvents24h]}
          sparkColor="#7e57c2"
          trend={usageTrend.text}
          trendTone={usageTrend.tone}
        />
        <OpsKpiCard
          label="Seat Util (30D)"
          value={`${kpis.seatUtilizationPct ?? 0}%`}
          sparkline={[kpis.seatUtilizationPct ?? 0, kpis.seatUtilizationPct ?? 0]}
          sparkColor="#26c6da"
        />
        <OpsKpiCard
          label="Churn (30D)"
          value={kpis.churnEvents30d}
          sparkline={[kpis.churnEvents30d, kpis.churnEvents30d]}
          sparkColor="#ef5350"
          trend={kpis.churnEvents30d === 0 ? "No change" : `${kpis.churnEvents30d} events`}
          trendTone={kpis.churnEvents30d === 0 ? "neutral" : "down"}
        />
      </div>

      <div className="ops-mid-grid">
        <Link href="/admin/market-truth" className="ops-card ops-link-card">
          <header className="ops-card-header">
            <Shield className="ops-card-icon green" />
            <h3>Market Truth</h3>
            <span className={`ops-pill ${truthOk ? "ok" : "warn"}`}>
              {truth?.dataMode ?? "—"}
            </span>
          </header>
          <p className="ops-card-stat">
            Mode <strong>{truth?.dataMode ?? "PRODUCTION"}</strong>
          </p>
          <p className="ops-muted">
            Demo in signal: {truth?.contamination.demoInSignal ?? 0} · Synthetic:{" "}
            {truth?.contamination.syntheticInSignal ?? 0}
          </p>
        </Link>

        <Link href="/admin/providers" className="ops-card ops-link-card">
          <header className="ops-card-header">
            <Radio className="ops-card-icon blue" />
            <h3>Providers</h3>
          </header>
          <p className="ops-card-stat">
            <strong>{providers?.providers.length ?? 0}</strong> tracked
          </p>
          <p className="ops-muted">
            {disabledProviders > 0
              ? `${disabledProviders} kill switch(es) off`
              : "All switches enabled"}
          </p>
          <div className="ops-provider-marks">
            {PROVIDER_MARKS.map((mark) => (
              <span key={mark.id} className={`ops-provider-mark ${mark.tone}`}>
                {mark.label}
              </span>
            ))}
            <span className="ops-provider-mark add">+</span>
          </div>
        </Link>

        <Link href="/admin/legacy" className="ops-card ops-link-card">
          <header className="ops-card-header">
            <BarChart3 className="ops-card-icon muted" />
            <h3>Full Analytics</h3>
          </header>
          <p className="ops-muted">
            Financial panel, signup map, demographics, feedback — classic scroll dashboard
          </p>
        </Link>

        <OpsActivityFeed />
      </div>

      <PlatformMonitorPanel variant="strip" />

      <OpsChartsRow topCountries={countries} />
    </section>
  );
}
