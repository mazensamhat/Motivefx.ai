"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Gauge,
  Radio,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { PlatformMonitorPanel } from "@/components/admin/platform-monitor-panel";
import { adminGet, type AdminDashboard } from "@/lib/admin-api";

type SiteDashboard = {
  totalUsers: number;
};

type MarketTruthSummary = {
  dataMode: string;
  golden: { ok: boolean };
  contamination: {
    demoInSignal: number;
    syntheticInSignal: number;
  };
};

type ProvidersSummary = {
  providers: { id: string; enabled: boolean }[];
};

export function OpsOverview() {
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

  if (loading && !dash) {
    return <p className="text-slate-400">Loading executive cockpit…</p>;
  }

  if (error && !dash) {
    return <p className="admin-error-banner">{error}</p>;
  }

  if (!dash) return null;

  const { kpis } = dash;
  const disabledProviders =
    providers?.providers.filter((p) => !p.enabled).length ?? 0;
  const truthOk =
    truth?.golden.ok &&
    (truth?.contamination.demoInSignal ?? 0) === 0 &&
    (truth?.contamination.syntheticInSignal ?? 0) === 0;

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Gauge className="h-5 w-5" />
        </div>
        <div>
          <h2>Overview</h2>
          <p>
            Executive cockpit · updated {new Date(dash.generatedAt).toLocaleString()}
          </p>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}

      <div className="admin-kpi-grid ops-kpi-grid">
        <div className="admin-kpi app-panel">
          <Users className="h-4 w-4" />
          <span className="admin-kpi-label">Site users</span>
          <strong>{siteUsers || kpis.totalUsers}</strong>
        </div>
        <div className="admin-kpi app-panel">
          <BarChart3 className="h-4 w-4" />
          <span className="admin-kpi-label">Paying accounts</span>
          <strong>{kpis.activeModuleSubscriptions}</strong>
        </div>
        <div className="admin-kpi app-panel">
          <Wallet className="h-4 w-4" />
          <span className="admin-kpi-label">Est. MRR</span>
          <strong>${kpis.estimatedMrrUsd.toLocaleString()}</strong>
        </div>
        <div className="admin-kpi app-panel">
          <Activity className="h-4 w-4" />
          <span className="admin-kpi-label">Usage (24h)</span>
          <strong>{kpis.usageEvents24h}</strong>
        </div>
        <div className="admin-kpi app-panel">
          <Gauge className="h-4 w-4" />
          <span className="admin-kpi-label">Seat util (30d)</span>
          <strong>{kpis.seatUtilizationPct ?? 0}%</strong>
        </div>
        <div className="admin-kpi app-panel admin-kpi-warn">
          <span className="admin-kpi-label">Churn (30d)</span>
          <strong>{kpis.churnEvents30d}</strong>
        </div>
      </div>

      <div className="ops-quick-grid">
        <Link href="/admin/market-truth" className="ops-quick-card app-panel">
          <div className="ops-quick-head">
            <Shield className="h-4 w-4 text-[#00e676]" />
            <span>Market Truth</span>
            {truthOk ? (
              <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="ml-auto h-4 w-4 text-amber-400" />
            )}
          </div>
          <p className="ops-quick-stat">
            Mode <strong>{truth?.dataMode ?? "—"}</strong>
          </p>
          <p className="ops-quick-meta">
            Demo in signal: {truth?.contamination.demoInSignal ?? "—"} · Synthetic:{" "}
            {truth?.contamination.syntheticInSignal ?? "—"}
          </p>
        </Link>

        <Link href="/admin/providers" className="ops-quick-card app-panel">
          <div className="ops-quick-head">
            <Radio className="h-4 w-4 text-[#00e5ff]" />
            <span>Providers</span>
          </div>
          <p className="ops-quick-stat">
            <strong>{providers?.providers.length ?? 0}</strong> tracked
          </p>
          <p className="ops-quick-meta">
            {disabledProviders > 0
              ? `${disabledProviders} kill switch(es) off`
              : "All switches enabled"}
          </p>
        </Link>

        <Link href="/admin/legacy" className="ops-quick-card app-panel">
          <div className="ops-quick-head">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <span>Full analytics</span>
          </div>
          <p className="ops-quick-meta">
            Financial panel, signup map, demographics, feedback — classic scroll dashboard
          </p>
        </Link>
      </div>

      <PlatformMonitorPanel />
    </section>
  );
}
