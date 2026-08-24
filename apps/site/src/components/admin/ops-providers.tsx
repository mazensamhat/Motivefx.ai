"use client";

import { useCallback, useEffect, useState } from "react";
import { Power, Radio, RefreshCw } from "lucide-react";

type ProviderRow = {
  id: string;
  label: string;
  envKey: string;
  enabled: boolean;
};

type ProvidersPayload = {
  generatedAt: string;
  providers: ProviderRow[];
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
            <h2>Providers</h2>
            <p>G3 kill switches — env flags, flip without emergency deploy</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading providers…</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid ops-kpi-grid">
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Providers</span>
              <strong>{data.providers.length}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Enabled</span>
              <strong>{data.providers.length - disabled}</strong>
            </div>
            <div className={`admin-kpi app-panel${disabled > 0 ? " admin-kpi-warn" : ""}`}>
              <span className="admin-kpi-label">Disabled</span>
              <strong>{disabled}</strong>
            </div>
          </div>

          <section className="admin-panel app-panel">
            <h2>Kill switches</h2>
            <p className="mb-4 text-xs text-slate-500">
              Read-only in Sprint 1. Set env vars on Render/Vercel to disable a provider. Updated{" "}
              {new Date(data.generatedAt).toLocaleString()}.
            </p>
            <div className="ops-provider-grid">
              {data.providers.map((p) => (
                <article
                  key={p.id}
                  className={`ops-provider-card${p.enabled ? " enabled" : " disabled"}`}
                >
                  <div className="ops-provider-head">
                    <Power className="h-4 w-4" />
                    <strong>{p.label}</strong>
                    <span className={`ops-status-dot${p.enabled ? " on" : " off"}`} />
                  </div>
                  <p className="mono text-xs text-slate-500">{p.envKey}</p>
                  <p className="text-sm">{p.enabled ? "Enabled" : "Disabled"}</p>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
