"use client";

import { useCallback, useState } from "react";
import { Bug, RefreshCw } from "lucide-react";

export function OpsIntelligenceDebugger() {
  const [symbol, setSymbol] = useState("NVDA");
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/intelligence?surface=debugger&symbol=${encodeURIComponent(symbol)}`,
        { cache: "no-store" }
      );
      if (!res.ok) throw new Error("Request failed");
      const body = (await res.json()) as { debugger: Record<string, unknown> | null };
      if (!body.debugger) {
        setData(null);
        setError(`No ledger entry for ${symbol.toUpperCase()} in this process`);
      } else {
        setData(body.debugger);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  const stages = (data?.stages as { stage: string; detail: string }[]) ?? [];
  const evidence =
    (data?.evidence as {
      id: string;
      provider: string;
      sourceType: string;
      truthState: string;
      group?: string;
      contribution?: number;
      freshness: string;
      simulation: boolean;
    }[]) ?? [];

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Bug className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Intelligence Debugger</h2>
            <p>RAW → TRUTH → FEATURES → SCORE → CONFIDENCE → EVIDENCE → AI</p>
          </div>
          <form
            className="ops-truth-filter"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <input
              className="ops-truth-input"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="Symbol"
            />
            <button type="submit" className="ops-toolbar-btn" disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Trace
            </button>
          </form>
        </div>
      </header>

      {error ? <p className="ops-error-banner">{error}</p> : null}

      {data ? (
        <>
          <p className="ops-muted">
            {String(data.symbol)} · {String(data.engineVersion)} ·{" "}
            {new Date(String(data.recordedAt)).toLocaleString()}
          </p>
          <section className="ops-card">
            <ol className="ops-debug-stages">
              {stages.map((s) => (
                <li key={s.stage}>
                  <strong>{s.stage}</strong>
                  <span>{s.detail}</span>
                </li>
              ))}
            </ol>
          </section>
          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Evidence nodes</h3>
            </header>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Source</th>
                    <th>Truth</th>
                    <th>Group</th>
                    <th>Contrib</th>
                    <th>Fresh</th>
                    <th>Sim</th>
                  </tr>
                </thead>
                <tbody>
                  {evidence.map((e) => (
                    <tr key={e.id}>
                      <td>{e.provider}</td>
                      <td>{e.sourceType}</td>
                      <td>
                        <span className="ops-truth-badge live">{e.truthState}</span>
                      </td>
                      <td>{e.group ?? "—"}</td>
                      <td>{e.contribution ?? 0}</td>
                      <td>{e.freshness}</td>
                      <td>{e.simulation ? "YES" : "No"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : (
        <p className="ops-muted">Enter a symbol that has ledger activity and click Trace.</p>
      )}
    </section>
  );
}
