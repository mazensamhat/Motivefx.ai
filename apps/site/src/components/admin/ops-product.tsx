"use client";

import { useCallback, useEffect, useState } from "react";
import { Layers, RefreshCw } from "lucide-react";
import { ActivityHeatmap } from "@/components/admin/activity-heatmap";
import { BarList } from "@/components/admin/admin-bar-list";
import { adminGet, type AdminDashboard } from "@/lib/admin-api";

function labelOf(labels: Record<string, string> | undefined, key: string, fallback?: string) {
  return labels?.[key] ?? fallback ?? key;
}

export function OpsProduct() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await adminGet<AdminDashboard>("/dashboard"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load product metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return <p className="text-slate-400">Loading product metrics…</p>;
  }

  if (error && !data) {
    return <p className="admin-error-banner">{error}</p>;
  }

  if (!data) return null;

  const {
    kpis,
    moduleLabels,
    moduleUtilization,
    moduleHealth,
    activityHeatmap,
    moduleActivityRanking,
  } = data;
  const utilRows = moduleUtilization ?? [];

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Layers className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Product</h2>
            <p>Module health · utilization · activity heatmap</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}

      <div className="admin-kpi-grid ops-kpi-grid">
        <div className="admin-kpi app-panel">
          <span className="admin-kpi-label">Usage (24h)</span>
          <strong>{kpis.usageEvents24h}</strong>
        </div>
        <div className="admin-kpi app-panel">
          <span className="admin-kpi-label">Seat util (30d)</span>
          <strong>{kpis.seatUtilizationPct ?? 0}%</strong>
        </div>
        <div className="admin-kpi app-panel">
          <span className="admin-kpi-label">Paying active (30d)</span>
          <strong>{kpis.payingActive30d ?? 0}</strong>
        </div>
      </div>

      <section className="admin-panel app-panel">
        <h2>Module health</h2>
        {moduleHealth.length === 0 ? (
          <p className="text-sm text-slate-400">No module health data yet.</p>
        ) : (
          <div className="admin-health-list">
            {moduleHealth.map((m) => (
              <div key={m.module} className={`admin-health-row status-${m.status}`}>
                <strong>{m.label}</strong>
                <span>{m.status}</span>
                <span>{m.usage7d} req/7d</span>
                <span>{m.avgLatencyMs}ms avg</span>
                <span>{m.errors7d} errors</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="admin-panel app-panel">
        <h2>Module utilization</h2>
        {utilRows.length === 0 ? (
          <p className="text-sm text-slate-400">No utilization data yet.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Seats</th>
                  <th>Active users</th>
                  <th>Events</th>
                  <th>Utilization</th>
                </tr>
              </thead>
              <tbody>
                {utilRows.map((row) => (
                  <tr key={row.module}>
                    <td>
                      <strong>{row.label}</strong>
                    </td>
                    <td>{row.subscribed}</td>
                    <td>{row.activeUsers}</td>
                    <td>{row.events}</td>
                    <td>
                      <div className="admin-util-cell">
                        <div className="admin-bar-track">
                          <div
                            className="admin-bar-fill"
                            style={{ width: `${Math.min(100, row.utilizationPct)}%` }}
                          />
                        </div>
                        <span>{row.utilizationPct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="admin-grid-2">
        <section className="admin-panel app-panel">
          <h2>Module activity (30d)</h2>
          <BarList
            items={moduleActivityRanking.map((m) => ({
              module: labelOf(moduleLabels, m.module, m.label),
              events: m.events,
            }))}
            labelKey="module"
            valueKey="events"
          />
        </section>
        <section className="admin-panel app-panel">
          <h2>Subscriptions by module</h2>
          <BarList
            items={data.subscriptionsByModule.map((m) => ({
              module: labelOf(moduleLabels, m.module, m.label),
              active: m.active,
            }))}
            labelKey="module"
            valueKey="active"
          />
        </section>
      </div>

      <ActivityHeatmap heatmap={activityHeatmap} moduleLabels={moduleLabels} />
    </section>
  );
}
