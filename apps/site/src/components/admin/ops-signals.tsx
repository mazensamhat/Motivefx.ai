"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Shield, Zap } from "lucide-react";

type SignalsPayload = {
  generatedAt: string;
  engineVersion: string;
  totals: {
    ledgerEntries: number;
    highSignal: number;
    lowConfidence: number;
    uniqueSymbols: number;
  };
  distribution: { stance: string; count: number }[];
  topSymbols: { symbol: string; count: number }[];
  suppression: {
    demoPriorsBlocked: boolean;
    demoInSignalBag: number;
    syntheticInSignalBag: number;
    lowConfidenceSignals: number;
    dataMode: string;
  };
  recentLedger: {
    ledgerId: string;
    recordedAt: string;
    symbol: string;
    motiveSignal?: number;
    stance: string | null;
    evidenceCount: number;
    signalEvidenceCount: number;
  }[];
};

export function OpsSignals() {
  const [data, setData] = useState<SignalsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/signals", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as SignalsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load signal ops");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxDist = Math.max(...(data?.distribution.map((d) => d.count) ?? [1]), 1);

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Zap className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Signals</h2>
            <p>Motive Signal distribution · suppression · ledger cross-link (G2)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/market-truth" className="admin-btn">
              <Shield className="h-3.5 w-3.5" /> Market Truth ledger
            </Link>
            <button type="button" className="admin-btn" onClick={load} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading signal ops…</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid ops-kpi-grid">
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Ledger entries</span>
              <strong>{data.totals.ledgerEntries}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Unique symbols</span>
              <strong>{data.totals.uniqueSymbols}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">High signal (≥70)</span>
              <strong>{data.totals.highSignal}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Low alignment (&lt;45)</span>
              <strong>{data.totals.lowConfidence}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Data mode</span>
              <strong className="mono text-lg">{data.suppression.dataMode}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Engine</span>
              <strong className="text-sm">{data.engineVersion}</strong>
            </div>
          </div>

          <div className="admin-grid-2">
            <section className="admin-panel app-panel">
              <h2>Stance distribution</h2>
              {data.distribution.length === 0 ? (
                <p className="text-sm text-slate-400">
                  No ledger entries yet. Generate a briefing or hit{" "}
                  <code className="mono text-xs">/api/intel/probability</code> to populate.
                </p>
              ) : (
                <div className="space-y-2">
                  {data.distribution.map((row) => (
                    <div key={row.stance} className="admin-util-cell">
                      <span className="min-w-[10rem] text-sm text-slate-300">{row.stance}</span>
                      <div className="admin-bar-track flex-1">
                        <div
                          className="admin-bar-fill bg-[#00e676]/70"
                          style={{ width: `${(row.count / maxDist) * 100}%` }}
                        />
                      </div>
                      <span className="mono text-sm">{row.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="admin-panel app-panel">
              <h2>Suppression &amp; integrity</h2>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>
                  Demo priors blocked in production:{" "}
                  <strong>{data.suppression.demoPriorsBlocked ? "Yes" : "No (demo mode)"}</strong>
                </li>
                <li>
                  DEMO in signal bag: <strong>{data.suppression.demoInSignalBag}</strong>
                </li>
                <li>
                  SYNTHETIC in signal bag: <strong>{data.suppression.syntheticInSignalBag}</strong>
                </li>
                <li>
                  Low-alignment signals in ledger:{" "}
                  <strong>{data.suppression.lowConfidenceSignals}</strong>
                </li>
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Full contamination audit on{" "}
                <Link href="/admin/market-truth" className="ops-inline-link">
                  Market Truth
                </Link>
                .
              </p>
            </section>
          </div>

          {data.topSymbols.length > 0 ? (
            <section className="admin-panel app-panel">
              <h2>Top symbols (ledger frequency)</h2>
              <div className="flex flex-wrap gap-2">
                {data.topSymbols.map((s) => (
                  <span key={s.symbol} className="ops-gate-pill ok">
                    <span className="mono">{s.symbol}</span>
                    <span className="text-slate-400">×{s.count}</span>
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <section className="admin-panel app-panel">
            <h2>Recent signal ledger</h2>
            {data.recentLedger.length === 0 ? (
              <p className="text-sm text-slate-400">
                Ledger populates when{" "}
                <code className="mono text-xs">buildProbabilityViews</code> runs (Daily Brief,
                intel API).
              </p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Symbol</th>
                      <th>Signal</th>
                      <th>Stance</th>
                      <th>Evidence</th>
                      <th>Eligible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentLedger.map((row) => (
                      <tr key={row.ledgerId}>
                        <td>{new Date(row.recordedAt).toLocaleString()}</td>
                        <td className="mono">{row.symbol}</td>
                        <td>{row.motiveSignal ?? "—"}</td>
                        <td className="text-xs">{row.stance ?? "—"}</td>
                        <td>{row.evidenceCount}</td>
                        <td>{row.signalEvidenceCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-slate-500">
              Updated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </section>
        </>
      ) : null}
    </section>
  );
}
