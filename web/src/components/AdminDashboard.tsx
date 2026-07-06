import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Brain,
  Database,
  Megaphone,
  RefreshCw,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import {
  adminGet,
  adminPost,
  getAdminKey,
  setAdminKey,
  type AdminAiAnalysis,
  type AdminDashboard,
} from "../lib/adminApi";
import { SocialIntegrationsPanel } from "./SocialIntegrationsPanel";

function heatColor(value: number, max: number): string {
  if (max <= 0 || value <= 0) return "rgba(255,255,255,0.03)";
  const t = value / max;
  return `rgba(0, 230, 118, ${0.12 + t * 0.75})`;
}

function BarList({ items, labelKey, valueKey }: { items: { [k: string]: string | number }[]; labelKey: string; valueKey: string }) {
  const max = Math.max(...items.map((i) => Number(i[valueKey]) || 0), 1);
  return (
    <div className="admin-bar-list">
      {items.map((item) => (
        <div key={String(item[labelKey])} className="admin-bar-row">
          <span className="admin-bar-label">{String(item[labelKey] ?? "—")}</span>
          <div className="admin-bar-track">
            <div
              className="admin-bar-fill"
              style={{ width: `${((Number(item[valueKey]) || 0) / max) * 100}%` }}
            />
          </div>
          <span className="admin-bar-val">{item[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard() {
  const [keyInput, setKeyInput] = useState(getAdminKey());
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AdminAiAnalysis["analysis"] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dash = await adminGet<AdminDashboard>("/dashboard");
      setData(dash);
      setAuthed(true);
    } catch (e) {
      setAuthed(false);
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAdminKey()) load();
  }, [load]);

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAdminKey(keyInput.trim());
    load();
  }

  async function runAiAnalysis() {
    setAiLoading(true);
    try {
      const res = await adminGet<AdminAiAnalysis>("/ai-analysis");
      setData(res.snapshot);
      setAiAnalysis(res.analysis);
    } catch (e) {
      setError(e instanceof Error ? e.message : "AI analysis failed");
    } finally {
      setAiLoading(false);
    }
  }

  async function seedDemo() {
    setSeeding(true);
    try {
      const res = await adminPost<{ dashboard: AdminDashboard }>("/seed-demo-analytics?user_count=48");
      setData(res.dashboard);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Seed failed");
    } finally {
      setSeeding(false);
    }
  }

  if (!authed) {
    return (
      <div className="admin-shell">
        <div className="admin-login glass-panel">
          <Shield size={28} className="admin-login-icon" />
          <h1>MotiveFX Ops Console</h1>
          <p>Subscription monitoring · module health · demographics · payments</p>
          <form onSubmit={handleLogin}>
            <label>
              Admin API key
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                placeholder="X-Admin-Key"
              />
            </label>
            {error && <p className="admin-error">{error}</p>}
            <button type="submit" className="btn btn-annual-cta" disabled={loading}>
              {loading ? "Connecting…" : "Enter console"}
            </button>
          </form>
          <p className="admin-login-hint">Default dev key: motivefx-admin-dev</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { kpis, activityHeatmap, demographics, payments } = data;

  return (
    <div className="admin-shell">
      <header className="admin-header glass-panel">
        <div>
          <h1>MotiveFX Ops Console</h1>
          <p className="admin-header-sub">
            Live subscription & module intelligence · updated {new Date(data.generatedAt).toLocaleString()}
          </p>
        </div>
        <div className="admin-header-actions">
          <button type="button" className="btn admin-btn admin-btn-ai" onClick={runAiAnalysis} disabled={aiLoading}>
            <Brain size={14} /> {aiLoading ? "Analyzing…" : "Run AI analysis"}
          </button>
          <button type="button" className="btn admin-btn" onClick={load} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button type="button" className="btn admin-btn" onClick={seedDemo} disabled={seeding}>
            <Database size={14} /> {seeding ? "Seeding…" : "Seed demo data"}
          </button>
          <a href="/" className="btn admin-btn">← Back to app</a>
        </div>
      </header>

      {error && <p className="admin-error-banner">{error}</p>}

      <section className="admin-kpi-grid">
        <div className="admin-kpi glass-panel">
          <Users size={18} />
          <span className="admin-kpi-label">Total users</span>
          <strong>{kpis.totalUsers}</strong>
        </div>
        <div className="admin-kpi glass-panel">
          <BarChart3 size={18} />
          <span className="admin-kpi-label">Active module subs</span>
          <strong>{kpis.activeModuleSubscriptions}</strong>
        </div>
        <div className="admin-kpi glass-panel">
          <Wallet size={18} />
          <span className="admin-kpi-label">Est. MRR</span>
          <strong>${kpis.estimatedMrrUsd.toLocaleString()}</strong>
        </div>
        <div className="admin-kpi glass-panel">
          <Activity size={18} />
          <span className="admin-kpi-label">Usage (24h)</span>
          <strong>{kpis.usageEvents24h}</strong>
        </div>
        <div className="admin-kpi glass-panel">
          <span className="admin-kpi-label">Annual subs</span>
          <strong>{kpis.annualSubscribers}</strong>
        </div>
        <div className="admin-kpi glass-panel admin-kpi-warn">
          <span className="admin-kpi-label">Churn (30d)</span>
          <strong>{kpis.churnEvents30d}</strong>
        </div>
      </section>

      {aiAnalysis && (
        <section className="admin-panel glass-panel admin-ai-panel">
          <div className="admin-ai-header">
            <Brain size={20} className="admin-ai-icon" />
            <div>
              <h2>AI Ops Analysis</h2>
              <p className="admin-ai-meta">Model: {aiAnalysis.model}</p>
            </div>
          </div>
          {aiAnalysis.highlights.length > 0 && (
            <div className="admin-ai-highlights">
              {aiAnalysis.highlights.map((h) => (
                <span key={h.text} className={`admin-ai-chip admin-ai-chip-${h.type}`}>{h.text}</span>
              ))}
            </div>
          )}
          <pre className="admin-ai-narrative">{aiAnalysis.narrative}</pre>
        </section>
      )}

      {data.channelPerformance && (
        <SocialIntegrationsPanel channelStats={data.channelPerformance} />
      )}

      {data.channelPerformance && (
        <section className="admin-panel glass-panel">
          <div className="admin-channel-header">
            <Megaphone size={18} />
            <h2>Subscription attribution by channel</h2>
            {data.channelPerformance.topRevenueChannel && (
              <span className="admin-channel-top">
                Top: {data.channelPerformance.topRevenueChannel}
              </span>
            )}
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Channel</th>
                  <th>Handle</th>
                  <th>Visits</th>
                  <th>Signups</th>
                  <th>Payments</th>
                  <th>Churns</th>
                  <th>Revenue</th>
                  <th>Conv %</th>
                </tr>
              </thead>
              <tbody>
                {data.channelPerformance.channels.map((ch) => (
                  <tr key={ch.id} className={ch.id === data.channelPerformance?.topRevenueChannel ? "admin-row-top" : ""}>
                    <td><strong>{ch.platform}</strong></td>
                    <td>{ch.handle}</td>
                    <td>{ch.visits ?? 0}</td>
                    <td>{ch.signups}</td>
                    <td>{ch.payments}</td>
                    <td>{ch.churns}</td>
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
        <section className="admin-panel glass-panel">
          <h2>Subscriptions by module</h2>
          <BarList items={data.subscriptionsByModule} labelKey="module" valueKey="active" />
        </section>
        <section className="admin-panel glass-panel">
          <h2>Module activity ranking (30d)</h2>
          <BarList items={data.moduleActivityRanking} labelKey="module" valueKey="events" />
        </section>
      </div>

      <section className="admin-panel glass-panel">
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

      <div className="admin-grid-2">
        <section className="admin-panel glass-panel">
          <h2>Churn by module (30d)</h2>
          <BarList items={data.churnByModule} labelKey="module" valueKey="cancellations" />
        </section>
        <section className="admin-panel glass-panel">
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
        <section className="admin-panel glass-panel">
          <h2>Sex</h2>
          <BarList items={demographics.sex} labelKey="sex" valueKey="c" />
        </section>
        <section className="admin-panel glass-panel">
          <h2>Gender</h2>
          <BarList items={demographics.gender} labelKey="gender" valueKey="c" />
        </section>
        <section className="admin-panel glass-panel">
          <h2>Payment methods</h2>
          <BarList items={demographics.paymentMethods} labelKey="payment_method" valueKey="c" />
        </section>
      </div>

      <div className="admin-grid-3">
        <section className="admin-panel glass-panel">
          <h2>Cohorts</h2>
          <BarList items={demographics.cohorts} labelKey="cohort" valueKey="c" />
        </section>
        <section className="admin-panel glass-panel">
          <h2>Age buckets</h2>
          <BarList items={demographics.ageBuckets} labelKey="bucket" valueKey="c" />
        </section>
        <section className="admin-panel glass-panel">
          <h2>Acquisition channels</h2>
          <BarList
            items={(data.channelPerformance?.channels ?? []).map((c) => ({ channel: c.platform, c: c.signups }))}
            labelKey="channel"
            valueKey="c"
          />
        </section>
      </div>

      <div className="admin-grid-2">
        <section className="admin-panel glass-panel">
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
        <section className="admin-panel glass-panel">
          <h2>Payments (90d)</h2>
          <p className="admin-revenue">${payments.revenueUsd.toLocaleString()} revenue · {payments.transactions} txns</p>
          <BarList items={payments.byPlanTier} labelKey="plan_tier" valueKey="revenue" />
        </section>
      </div>

      <section className="admin-panel glass-panel">
        <h2>Recent users</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Cohort</th>
                <th>Age</th>
                <th>Sex</th>
                <th>Gender</th>
                <th>Channel</th>
                <th>Location</th>
                <th>Payment</th>
                <th>Modules</th>
                <th>Last seen</th>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.map((u) => (
                <tr key={u.user_id}>
                  <td className="mono">{u.user_id}</td>
                  <td>{u.cohort ?? "—"}</td>
                  <td>{u.age ?? "—"}</td>
                  <td>{u.sex ?? "—"}</td>
                  <td>{u.gender ?? "—"}</td>
                  <td>{u.acquisition_channel ?? "—"}</td>
                  <td>{u.city ? `${u.city}, ${u.country}` : "—"}</td>
                  <td>{u.payment_method ?? "—"}</td>
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
