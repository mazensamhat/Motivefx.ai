"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  RefreshCw,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { BarList } from "@/components/admin/admin-bar-list";
import { FeedbackInboxPanel } from "@/components/admin/feedback-inbox-panel";
import { PlatformMonitorPanel } from "@/components/admin/platform-monitor-panel";
import { SignupMap, type SignupMapData } from "@/components/admin/signup-map";
import { SiteUsersPanel } from "@/components/admin/site-users-panel";
import { adminGet, type AdminDashboard } from "@/lib/admin-api";
import { clientLogout } from "@/lib/auth-client";
import { MOTIVELIFE_OPS_URL } from "@/lib/ops-links";

function heatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "rgba(255,255,255,0.03)";
  const t = value / max;
  return `rgba(0, 230, 118, ${0.12 + t * 0.75})`;
}

type SiteDashboard = {
  signupsByDay: { day: string; count: number }[];
  signupMap: SignupMapData;
  totalUsers: number;
};

export function AdminDashboard({ adminEmail }: { adminEmail: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [siteData, setSiteData] = useState<SiteDashboard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, siteRes] = await Promise.all([
        adminGet<AdminDashboard>("/dashboard"),
        fetch("/api/admin/site-dashboard", { cache: "no-store" }),
      ]);
      setData(dashRes);
      if (siteRes.ok) {
        setSiteData((await siteRes.json()) as SiteDashboard);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="admin-shell flex min-h-screen items-center justify-center">
        <p className="text-slate-400">Loading ops console…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="admin-shell mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-4 px-4">
        <Shield className="h-8 w-8 text-[#00e676]" />
        <h1 className="text-xl font-semibold text-white">Ops Console unavailable</h1>
        <p className="text-center text-sm text-slate-400">{error}</p>
        <Link href="/app" className="admin-btn">← Back to terminal</Link>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, activityHeatmap, demographics, payments } = data;
  const maxSignup = Math.max(...(siteData?.signupsByDay.map((d) => d.count) ?? [0]), 1);

  return (
    <div className="admin-shell mx-auto max-w-7xl">
      <header className="admin-header app-panel">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#00e676]">MotiveFX Ops Console</p>
          <h1>Platform intelligence</h1>
          <p className="admin-header-sub">
            Signed in as {adminEmail} · updated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="admin-header-actions">
          <a href={MOTIVELIFE_OPS_URL} target="_blank" rel="noopener noreferrer" className="admin-btn">
            <ExternalLink className="h-3.5 w-3.5" /> Motive Life Ops
          </a>
          <Link href="/app" className="admin-btn">
            <LayoutDashboard className="h-3.5 w-3.5" /> Terminal
          </Link>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button type="button" className="admin-btn" onClick={() => clientLogout()}>
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </header>

      {error && <p className="admin-error-banner">{error}</p>}

      <section className="admin-kpi-grid">
        <div className="admin-kpi app-panel">
          <Users className="h-4 w-4" />
          <span className="admin-kpi-label">Site users</span>
          <strong>{siteData?.totalUsers ?? kpis.totalUsers}</strong>
        </div>
        <div className="admin-kpi app-panel">
          <BarChart3 className="h-4 w-4" />
          <span className="admin-kpi-label">Active module subs</span>
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
          <span className="admin-kpi-label">Annual subs</span>
          <strong>{kpis.annualSubscribers}</strong>
        </div>
        <div className="admin-kpi app-panel admin-kpi-warn">
          <span className="admin-kpi-label">Churn (30d)</span>
          <strong>{kpis.churnEvents30d}</strong>
        </div>
      </section>

      <PlatformMonitorPanel />
      <SiteUsersPanel />

      {siteData?.signupMap && <SignupMap data={siteData.signupMap} />}

      {data.channelPerformance && data.channelPerformance.channels.length > 0 && (
        <section className="admin-panel app-panel">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-slate-400" />
            <h2>Subscription attribution by channel</h2>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Handle</th>
                  <th>Signups</th>
                  <th>Payments</th>
                  <th>Revenue</th>
                  <th>Conv %</th>
                </tr>
              </thead>
              <tbody>
                {data.channelPerformance.channels.map((ch) => (
                  <tr key={ch.id}>
                    <td><strong>{ch.platform}</strong></td>
                    <td>{ch.handle}</td>
                    <td>{ch.signups}</td>
                    <td>{ch.payments}</td>
                    <td>${ch.revenueUsd.toLocaleString()}</td>
                    <td>{ch.conversionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="admin-grid-2">
        <section className="admin-panel app-panel">
          <h2>Subscriptions by module</h2>
          <BarList items={data.subscriptionsByModule} labelKey="module" valueKey="active" />
        </section>
        <section className="admin-panel app-panel">
          <h2>Module activity (30d)</h2>
          <BarList items={data.moduleActivityRanking} labelKey="module" valueKey="events" />
        </section>
      </div>

      <section className="admin-panel app-panel">
        <h2>Activity heatmap (14 days)</h2>
        <div className="admin-heatmap-wrap">
          <table className="admin-heatmap">
            <thead>
              <tr>
                <th>Module</th>
                {activityHeatmap.days.map((d) => (
                  <th key={d}>{d.slice(5)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activityHeatmap.modules.map((mod) => (
                <tr key={mod}>
                  <td>{mod}</td>
                  {activityHeatmap.days.map((day) => {
                    const val = activityHeatmap.cells[mod]?.[day] ?? 0;
                    return (
                      <td
                        key={day}
                        className="admin-heatmap-cell"
                        style={{ background: heatColor(val, activityHeatmap.max) }}
                        title={`${mod} · ${day}: ${val} events`}
                      >
                        {val > 0 ? val : ""}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {siteData?.signupsByDay && (
        <section className="admin-panel app-panel">
          <h2>Site signups (14 days)</h2>
          <div className="flex h-32 items-end gap-1">
            {siteData.signupsByDay.map((d) => (
              <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t bg-[#00e676]/70"
                  style={{ height: `${Math.max(4, (d.count / maxSignup) * 100)}%` }}
                  title={`${d.day}: ${d.count}`}
                />
                <span className="text-[10px] text-slate-500">{d.day.slice(5)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="admin-grid-2">
        <section className="admin-panel app-panel">
          <h2>Churn by module (30d)</h2>
          <BarList items={data.churnByModule} labelKey="module" valueKey="cancellations" />
        </section>
        <section className="admin-panel app-panel">
          <h2>Module health</h2>
          <div className="admin-health-list">
            {data.moduleHealth.map((m) => (
              <div key={m.module} className={`admin-health-row status-${m.status}`}>
                <strong>{m.label}</strong>
                <span>{m.status}</span>
                <span>{m.usage7d} req/7d</span>
                <span>{m.avgLatencyMs}ms avg</span>
                <span>{m.errors7d} errors</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="admin-grid-3">
        <section className="admin-panel app-panel">
          <h2>Cohorts</h2>
          <BarList items={demographics.cohorts} labelKey="cohort" valueKey="c" />
        </section>
        <section className="admin-panel app-panel">
          <h2>Age buckets</h2>
          <BarList items={demographics.ageBuckets} labelKey="bucket" valueKey="c" />
        </section>
        <section className="admin-panel app-panel">
          <h2>Payment methods</h2>
          <BarList items={demographics.paymentMethods} labelKey="payment_method" valueKey="c" />
        </section>
      </div>

      <div className="admin-grid-2">
        <section className="admin-panel app-panel">
          <h2>Payments (90d)</h2>
          <p className="admin-revenue">
            ${payments.revenueUsd.toLocaleString()} revenue · {payments.transactions} txns
          </p>
          <BarList items={payments.byPlanTier} labelKey="plan_tier" valueKey="revenue" />
        </section>
        <section className="admin-panel app-panel">
          <h2>Top locations</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>City</th><th>Country</th><th>Users</th></tr>
              </thead>
              <tbody>
                {demographics.topLocations.map((loc) => (
                  <tr key={`${loc.city}-${loc.country}`}>
                    <td>{loc.city}</td>
                    <td>{loc.country}</td>
                    <td>{loc.c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <FeedbackInboxPanel />

      <section className="admin-panel app-panel">
        <h2>Recent users</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Cohort</th>
                <th>Channel</th>
                <th>Location</th>
                <th>Modules</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((u) => (
                <tr key={u.user_id}>
                  <td className="mono">{u.user_id}</td>
                  <td>{u.cohort ?? "—"}</td>
                  <td>{u.acquisition_channel ?? "—"}</td>
                  <td>{u.city ? `${u.city}, ${u.country}` : "—"}</td>
                  <td>{u.active_modules ?? "—"}</td>
                  <td>{new Date(u.last_seen_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
