"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, CheckCircle2, RefreshCw, Shield } from "lucide-react";
import { truthStateBadge, type TruthState } from "@/lib/ops/truth-state";

type MarketTruthPayload = {
  generatedAt: string;
  dataMode: string;
  engineVersion: string;
  golden: { ok: boolean; checks: Record<string, boolean> };
  contamination: { entries: number; demoInSignal: number; syntheticInSignal: number };
  truthStateCounts: Record<string, number>;
  freshness: { bucket: string; count: number }[];
  assets: {
    symbol: string;
    motiveSignal: number | null;
    provider: string;
    sourceType: string;
    truthState: TruthState;
    sourceTimestamp: string | null;
    retrievedAt: string | null;
    ageSeconds: number | null;
    evidenceCount: number;
    signalEligible: number;
    ledgerId: string;
    recordedAt: string;
  }[];
  provenanceSamples: {
    symbol: string;
    sourceProvider: string;
    truthState: TruthState;
    sourceTimestamp: string;
    retrievedAt: string;
    freshnessSeconds?: number;
    simulated: boolean;
    licensedForDisplay: boolean;
    licensedForDerivativeUse: boolean;
    mayPromote: boolean;
  }[];
  rightsBlocked: number;
  symbolFilter: string | null;
};

function GatePill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`ops-gate-pill${ok ? " ok" : " fail"}`}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
      {label}
    </span>
  );
}

function TruthBadge({ state }: { state: TruthState }) {
  const badge = truthStateBadge(state);
  return <span className={`ops-truth-badge ${badge.tone}`}>{badge.label}</span>;
}

export function OpsMarketTruth() {
  const searchParams = useSearchParams();
  const symbolParam = searchParams.get("symbol");
  const [data, setData] = useState<MarketTruthPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState(symbolParam ?? "");

  const load = useCallback(async (symbol?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = symbol ? `?symbol=${encodeURIComponent(symbol)}` : "";
      const res = await fetch(`/api/admin/market-truth${qs}`, { cache: "no-store" });
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
    void load(symbolParam ?? undefined);
    if (symbolParam) setFilter(symbolParam);
  }, [load, symbolParam]);

  const g1Pass = useMemo(
    () =>
      data &&
      data.contamination.demoInSignal === 0 &&
      data.contamination.syntheticInSignal === 0 &&
      data.golden.ok,
    [data]
  );

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Market Truth Control Room</h2>
            <p>Per-asset provenance · truth states · freshness · live vs simulated enforcement</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <form
              className="ops-truth-filter"
              onSubmit={(e) => {
                e.preventDefault();
                void load(filter.trim() || undefined);
              }}
            >
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value.toUpperCase())}
                placeholder="Symbol e.g. NVDA"
                className="ops-truth-input"
              />
              <button type="submit" className="ops-toolbar-btn">
                Filter
              </button>
            </form>
            <button type="button" className="ops-toolbar-btn" onClick={() => load()} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </header>

      {error ? <p className="ops-error-banner">{error}</p> : null}
      {loading && !data ? <p className="ops-muted">Loading market truth…</p> : null}

      {data ? (
        <>
          <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))" }}>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">G1 status</span>
              <strong className="ops-kpi-value">{g1Pass ? "PASS" : "ATTENTION"}</strong>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Data mode</span>
              <strong className="ops-kpi-value" style={{ fontSize: "1rem" }}>
                {data.dataMode}
              </strong>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Assets tracked</span>
              <strong className="ops-kpi-value">{data.assets.length}</strong>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Demo in signal</span>
              <strong className="ops-kpi-value">{data.contamination.demoInSignal}</strong>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Synthetic in signal</span>
              <strong className="ops-kpi-value">{data.contamination.syntheticInSignal}</strong>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Rights blocked</span>
              <strong className="ops-kpi-value">{data.rightsBlocked}</strong>
            </article>
          </div>

          <div className="ops-attention-grid">
            <section className="ops-card">
              <header className="ops-card-header">
                <h3>Truth state mix</h3>
              </header>
              <div className="ops-gate-row">
                {Object.entries(data.truthStateCounts).length === 0 ? (
                  <p className="ops-muted">No evidence in ledger yet</p>
                ) : (
                  Object.entries(data.truthStateCounts).map(([state, count]) => (
                    <span key={state} className="ops-gate-pill">
                      <TruthBadge state={state as TruthState} /> ×{count}
                    </span>
                  ))
                )}
              </div>
            </section>
            <section className="ops-card">
              <header className="ops-card-header">
                <h3>Freshness</h3>
              </header>
              <ul className="ops-freshness-list">
                {data.freshness.map((row) => (
                  <li key={row.bucket}>
                    <span>{row.bucket}</span>
                    <strong>{row.count}</strong>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Golden checks</h3>
            </header>
            <div className="ops-gate-row">
              {Object.entries(data.golden.checks).map(([key, ok]) => (
                <GatePill key={key} ok={ok} label={key} />
              ))}
            </div>
            <p className="ops-muted" style={{ marginTop: "0.75rem" }}>
              Engine {data.engineVersion} · updated {new Date(data.generatedAt).toLocaleString()}
            </p>
          </section>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Asset truth desk</h3>
            </header>
            {data.assets.length === 0 ? (
              <p className="ops-muted">
                No ledger entries yet. Entries appear when Motive Signal records evidence.
              </p>
            ) : (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Signal</th>
                      <th>Provider</th>
                      <th>Truth</th>
                      <th>Source time</th>
                      <th>Age</th>
                      <th>Evidence</th>
                      <th>Eligible</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assets.map((row) => (
                      <tr key={row.ledgerId}>
                        <td className="mono">{row.symbol}</td>
                        <td>{row.motiveSignal ?? "—"}</td>
                        <td>{row.provider}</td>
                        <td>
                          <TruthBadge state={row.truthState} />
                        </td>
                        <td className="mono text-xs">
                          {row.sourceTimestamp
                            ? new Date(row.sourceTimestamp).toLocaleTimeString()
                            : "—"}
                        </td>
                        <td>
                          {row.ageSeconds != null ? `${row.ageSeconds.toFixed(1)}s` : "—"}
                        </td>
                        <td>{row.evidenceCount}</td>
                        <td>{row.signalEligible}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Provenance samples</h3>
            </header>
            {data.provenanceSamples.length === 0 ? (
              <p className="ops-muted">No provenance to show</p>
            ) : (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Provider</th>
                      <th>Truth</th>
                      <th>Freshness</th>
                      <th>Simulated</th>
                      <th>Rights</th>
                      <th>Promote?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.provenanceSamples.map((row, i) => (
                      <tr key={`${row.symbol}-${i}`}>
                        <td className="mono">{row.symbol}</td>
                        <td>{row.sourceProvider}</td>
                        <td>
                          <TruthBadge state={row.truthState} />
                        </td>
                        <td>
                          {row.freshnessSeconds != null
                            ? `${row.freshnessSeconds.toFixed(1)}s`
                            : "—"}
                        </td>
                        <td>{row.simulated ? "YES" : "No"}</td>
                        <td>
                          {row.licensedForDisplay ? "display" : "no-display"}
                          {row.licensedForDerivativeUse ? " · derive" : ""}
                        </td>
                        <td>{row.mayPromote ? "Yes" : "BLOCKED"}</td>
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
