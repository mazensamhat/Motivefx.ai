"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Brain, RefreshCw } from "lucide-react";

type AiCostsPayload = {
  generatedAt: string;
  dataMode: string;
  flags: {
    openaiConfigured: boolean;
    anthropicConfigured: boolean;
    askMotiveEnabled: boolean;
    adminApiKeyConfigured: boolean;
  };
  economics: {
    principle: string;
    briefingBudgetNote: string;
    legacyViteAiNote: string;
  };
  stubMetrics: {
    label: string;
    value: string;
    note: string;
  }[];
};

export function OpsAiCosts() {
  const [data, setData] = useState<AiCostsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-costs", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as AiCostsPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load AI costs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Brain className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>AI &amp; Costs</h2>
            <p>Token economics · env flags · G5 hardening status (honest stub until metering API)</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}
      {loading && !data ? <p className="text-slate-400">Loading AI economics…</p> : null}

      {data ? (
        <>
          <div className="admin-kpi-grid ops-kpi-grid">
            {data.stubMetrics.map((m) => (
              <div key={m.label} className="admin-kpi app-panel">
                <span className="admin-kpi-label">{m.label}</span>
                <strong>{m.value}</strong>
                <span className="text-xs text-slate-500">{m.note}</span>
              </div>
            ))}
          </div>

          <section className="admin-panel app-panel">
            <h2>Provider flags</h2>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>OpenAI key: {data.flags.openaiConfigured ? "Configured" : "Not set"}</li>
              <li>Anthropic key: {data.flags.anthropicConfigured ? "Configured" : "Not set"}</li>
              <li>Ask Motive: {data.flags.askMotiveEnabled ? "Enabled" : "Disabled / unconfigured"}</li>
              <li>Legacy Vite admin API key: {data.flags.adminApiKeyConfigured ? "Set" : "Not set"}</li>
            </ul>
            <p className="mt-3 text-xs text-slate-500">Data mode: {data.dataMode}</p>
          </section>

          <section className="admin-panel app-panel">
            <h2>G5 economics principle</h2>
            <p className="text-sm text-slate-400">{data.economics.principle}</p>
            <p className="mt-2 text-sm text-slate-400">{data.economics.briefingBudgetNote}</p>
            <p className="mt-2 text-xs text-slate-500">{data.economics.legacyViteAiNote}</p>
            <Link
              href="/admin/legacy"
              className="ops-inline-link mt-3 inline-block text-sm"
            >
              Legacy Vite terminal admin has on-demand AI analysis →
            </Link>
          </section>
        </>
      ) : null}
    </section>
  );
}
