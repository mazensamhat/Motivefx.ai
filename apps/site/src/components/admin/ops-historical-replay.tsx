"use client";

import { useCallback, useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";

type Period = { key: string; label: string; asOf: string };
type Job = {
  id: string;
  periodKey: string;
  periodLabel: string;
  status: string;
  asOfTimestamp: string;
  signalsEvaluated: number;
  directionAccuracy: number | null;
  error: string | null;
  createdAt: string;
  completedAt: string | null;
};

export function OpsHistoricalReplay() {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [queuing, setQueuing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/replay", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load replay");
      const body = (await res.json()) as { periods: Period[]; jobs: Job[] };
      setPeriods(body.periods);
      setJobs(body.jobs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const queue = async (periodKey: string) => {
    setQueuing(periodKey);
    try {
      const res = await fetch("/api/admin/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodKey }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Enqueue failed");
      }
      await load();
      window.setTimeout(() => void load(), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enqueue failed");
    } finally {
      setQueuing(null);
    }
  };

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <History className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Historical Replay</h2>
            <p>
              Replay market periods through snapshots available at that timestamp only (look-ahead
              protected)
            </p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}

      <section className="ops-card">
        <div className="ops-provider-grid">
          {periods.map((p) => (
            <article key={p.key} className="ops-provider-card">
              <strong>{p.label}</strong>
              <p className="ops-muted" style={{ marginTop: 6 }}>
                asOf {p.asOf.slice(0, 10)} · look-ahead protected
              </p>
              <button
                type="button"
                className="ops-toolbar-btn"
                style={{ marginTop: 8 }}
                disabled={queuing === p.key}
                onClick={() => void queue(p.key)}
              >
                {queuing === p.key ? "Queuing…" : "Queue replay"}
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="ops-card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 12 }}>Recent jobs</h3>
        {jobs.length === 0 ? (
          <p className="ops-muted">No replay jobs yet. Queue a period above.</p>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Signals</th>
                  <th>Direction accuracy</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id}>
                    <td>{j.periodLabel}</td>
                    <td>{j.status}</td>
                    <td>{j.signalsEvaluated}</td>
                    <td>
                      {j.directionAccuracy != null ? `${j.directionAccuracy}%` : j.error ?? "—"}
                    </td>
                    <td className="mono">{j.createdAt.slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
