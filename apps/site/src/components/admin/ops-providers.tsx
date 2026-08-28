"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Power, Radio, RefreshCw } from "lucide-react";

type ProviderV2 = {
  id: string;
  label: string;
  envKey: string;
  enabled: boolean;
  markets: string[];
  status: "healthy" | "disabled";
  authentication: string;
  rights: {
    known: boolean;
    display: boolean;
    derivatives: boolean;
    ai: boolean;
    cacheSeconds: number | null;
  };
  successPct: number | null;
  freshness: string;
  primary: boolean;
  secondary: string | null;
};

type PlatformCard = {
  id: string;
  name: string;
  status: string;
  summary: string;
  dashboardUrl: string | null;
  metrics: { label: string; value: string }[];
};

type CoverageRow = { desk: string; pct: number };

type ProvidersPayload = {
  generatedAt: string;
  providers: ProviderV2[];
  platforms: PlatformCard[];
  coverage: CoverageRow[];
};

export function OpsProviders() {
  const [data, setData] = useState<ProvidersPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/providers", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as ProvidersPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const disabled = data?.providers.filter((p) => !p.enabled).length ?? 0;

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Radio className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Provider Health</h2>
            <p>Kill switches · markets · rights · coverage · platform pulse</p>
          </div>
          <button type="button" className="ops-toolbar-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="ops-error-banner">{error}</p> : null}
      {loading && !data ? <p className="ops-muted">Loading providers…</p> : null}

      {data ? (
        <>
          <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Providers</span>
              <strong className="ops-kpi-value">{data.providers.length}</strong>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Enabled</span>
              <strong className="ops-kpi-value">{data.providers.length - disabled}</strong>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Disabled</span>
              <strong className="ops-kpi-value">{disabled}</strong>
              <p className={`ops-kpi-trend ${disabled ? "down" : "neutral"}`}>
                {disabled ? "Kill switch active" : "All switches on"}
              </p>
            </article>
            <article className="ops-kpi-card">
              <span className="ops-kpi-label">Platforms</span>
              <strong className="ops-kpi-value">{data.platforms.length}</strong>
            </article>
          </div>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Market coverage</h3>
            </header>
            <ul className="ops-coverage-list">
              {data.coverage.map((row) => (
                <li key={row.desk}>
                  <span>{row.desk}</span>
                  <div className="ops-country-bar">
                    <span style={{ width: `${Math.max(row.pct, 2)}%` }} />
                  </div>
                  <strong>{row.pct}%</strong>
                </li>
              ))}
            </ul>
            <p className="ops-muted" style={{ marginTop: "0.75rem" }}>
              Options / Pink Sheets incomplete by design until dedicated vendors are connected.
            </p>
          </section>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Provider desk</h3>
            </header>
            <p className="ops-muted" style={{ marginBottom: "0.75rem" }}>
              Read-only kill switches via env. Updated {new Date(data.generatedAt).toLocaleString()}.
            </p>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Markets</th>
                    <th>Freshness</th>
                    <th>Success</th>
                    <th>Rights</th>
                    <th>Role</th>
                    <th>Env</th>
                  </tr>
                </thead>
                <tbody>
                  {data.providers.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="ops-provider-head" style={{ margin: 0 }}>
                          <Power className="h-3.5 w-3.5" />
                          <strong>{p.label}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`ops-intel-pill ${p.enabled ? "healthy" : "critical"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="text-xs">{p.markets.join(", ") || "—"}</td>
                      <td>
                        <span
                          className={`ops-truth-badge ${
                            p.freshness === "LIVE" ? "live" : "critical"
                          }`}
                        >
                          {p.freshness}
                        </span>
                      </td>
                      <td>{p.successPct != null ? `${p.successPct}%` : "—"}</td>
                      <td className="text-xs">
                        {p.rights.known ? (
                          <>
                            {p.rights.display ? "display" : "no-display"}
                            {p.rights.derivatives ? " · derive" : ""}
                            {p.rights.ai ? " · AI" : ""}
                          </>
                        ) : (
                          <span className="ops-truth-badge critical">UNKNOWN</span>
                        )}
                      </td>
                      <td className="text-xs">
                        {p.primary ? "PRIMARY" : p.secondary ? `SEC · ${p.secondary}` : "—"}
                      </td>
                      <td className="mono text-xs">{p.envKey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="ops-card">
            <header className="ops-card-header">
              <h3>Infrastructure platforms</h3>
            </header>
            <div className="ops-platform-strip">
              {data.platforms.map((p) => (
                <article key={p.id} className={`ops-platform-tile ${p.status}`}>
                  <div className="ops-platform-tile-head">
                    <div>
                      <div className="ops-platform-title">
                        <h3>{p.name}</h3>
                      </div>
                      <p className="ops-muted">{p.summary}</p>
                    </div>
                    {p.dashboardUrl ? (
                      <a
                        href={p.dashboardUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ops-platform-link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ) : null}
                  </div>
                  {p.metrics.length > 0 ? (
                    <dl className="ops-platform-metrics">
                      {p.metrics.slice(0, 3).map((m) => (
                        <div key={m.label}>
                          <dt>{m.label}</dt>
                          <dd>{m.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
