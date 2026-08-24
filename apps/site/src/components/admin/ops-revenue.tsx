"use client";

import { useCallback, useEffect, useState } from "react";
import { DollarSign, RefreshCw } from "lucide-react";
import { FinancialPanel } from "@/components/admin/financial-panel";

type StripeStatus = {
  configured: boolean;
  mode: string;
  webhookUrl: string;
  checklist: { ok: boolean; label: string }[];
};

export function OpsRevenue() {
  const [stripe, setStripe] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/stripe-status", { cache: "no-store" });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? `Request failed: ${res.status}`);
      }
      setStripe((await res.json()) as StripeStatus);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load Stripe status");
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
          <DollarSign className="h-5 w-5" />
        </div>
        <div className="flex flex-1 flex-wrap items-start justify-between gap-3">
          <div>
            <h2>Revenue</h2>
            <p>Financial analytics · MRR · retention · Stripe configuration</p>
          </div>
          <button type="button" className="admin-btn" onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error ? <p className="admin-error-banner">{error}</p> : null}

      {stripe ? (
        <section className="admin-panel app-panel">
          <h2>Stripe status</h2>
          <div className="admin-kpi-grid ops-kpi-grid">
            <div className={`admin-kpi app-panel${stripe.configured ? "" : " admin-kpi-warn"}`}>
              <span className="admin-kpi-label">Configured</span>
              <strong>{stripe.configured ? "Yes" : "No"}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Mode</span>
              <strong className="mono">{stripe.mode}</strong>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-500 mono break-all">{stripe.webhookUrl}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {stripe.checklist.map((item) => (
              <li key={item.label} className={item.ok ? "text-emerald-400" : "text-amber-400"}>
                {item.ok ? "✓" : "○"} {item.label}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <FinancialPanel />
    </section>
  );
}
