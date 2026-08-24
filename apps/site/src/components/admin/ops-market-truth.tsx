"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Shield } from "lucide-react";

type MarketTruthPayload = {
  generatedAt: string;
  dataMode: string;
  engineVersion: string;
  golden: {
    ok: boolean;
    checks: Record<string, boolean>;
  };
  contamination: {
    entries: number;
    demoInSignal: number;
    syntheticInSignal: number;
  };
  recentLedger: {
    ledgerId: string;
    recordedAt: string;
    symbol: string;
    motiveSignal?: number;
    engineVersion: string;
    evidenceCount: number;
    signalEvidenceCount: number;
  }[];
};

function GatePill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`ops-gate-pill${ok ? " ok" : " fail"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

export function OpsMarketTruth() {
  const [data, setData] = useState<MarketTruthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/market-truth", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as MarketTruthPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load market truth");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const g1Pass =
    data &&
    data.contamination.demoInSignal === 0 &&
    data.contamination.syntheticInSignal === 0 &&
    data.golden.ok;

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Market Truth</h2>
            <p>
              G1 evidence ledger · overlaps Truth Console in production hardening plan (G1)
            </p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading market truth…</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid ops-kpi-grid">
            <div className={`admin-kpi app-panel${g1Pass ? "" : " admin-kpi-warn"}`}>
              <span className="admin-kpi-label">G1 status</span>
              <strong>{g1Pass ? "PASS" : "ATTENTION"}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Data mode</span>
              <strong className="mono text-lg">{data.dataMode}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Ledger entries</span>
              <strong>{data.contamination.entries}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Demo in signal</span>
              <strong>{data.contamination.demoInSignal}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Synthetic in signal</span>
              <strong>{data.contamination.syntheticInSignal}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Engine</span>
              <strong className="text-sm">{data.engineVersion}</strong>
            </div>
          </div>

          <section className="admin-panel app-panel">
            <h2>Golden checks</h2>
            <div className="ops-gate-row">
              {Object.entries(data.golden.checks).map(([key, ok]) => (
                <GatePill key={key} ok={ok} label={key} />
              ))}
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Updated {new Date(data.generatedAt).toLocaleString()} · in-process ledger (durable DB
              with G6 Signal Snapshots)
            </p>
          </section>

          <section className="admin-panel app-panel">
            <h2>Recent evidence ledger</h2>
            {data.recentLedger.length === 0 ? (
              <p className="text-sm text-slate-400">
                No ledger entries yet. Entries appear when Motive Signal records evidence via{" "}
                <code className="mono text-xs">recordSignalEvidence</code>.
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Symbol</th>
                      <th>Signal</th>
                      <th>Evidence</th>
                      <th>Signal-eligible</th>
                      <th>Engine</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLedger.map((row) => (
                      <tr key={row.ledgerId}>
                        <td>{new Date(row.recordedAt).toLocaleString()}</td>
                        <td className="mono">{row.symbol}</td>
                        <td>{row.motiveSignal ?? "—"}</td>
                        <td>{row.evidenceCount}</td>
                        <td>{row.signalEvidenceCount}</td>
                        <td className="text-xs text-slate-400">{row.engineVersion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}
    </section>
  );
}
