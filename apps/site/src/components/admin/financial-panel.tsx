"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  DollarSign,
  LineChart,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { BarList } from "@/components/admin/admin-bar-list";
import type { FinancialSnapshot } from "@/lib/admin-financial-analytics";

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function pct(n: number): string {
  return `${n}%`;
}

export function FinancialPanel() {
  const [data, setData] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/financial", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }
      setData((await res.json()) as FinancialSnapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load financial metrics");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) {
    return (
      <section className="admin-panel app-panel">
        <h2>Revenue &amp; retention</h2>
        <p className="text-sm text-slate-400">Loading financial metrics…</p>
      </section>
    );
  }

  if (error && !data) {
    return (
      <section className="admin-panel app-panel">
        <div className="mb-3 flex items-center justify-between">
          <h2>Revenue &amp; retention</h2>
          <button type="button" className="admin-btn" onClick={() => void load()}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
        <p className="admin-error-banner">{error}</p>
      </section>
    );
  }

  if (!data) return null;

  const { pulse, retention, board, byTier, subscriptionMix, mrrByCountry, mrrTrend, waterfall, cohorts, atRisk, product, assumptions } = data;
  const maxTrend = Math.max(...mrrTrend.map((m) => m.mrr), 1);

  return (
    <>
      {/* ---- The Pulse ---- */}
      <section className="admin-panel app-panel">
        <div className="mb-4 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-[#00e676]" />
          <h2>Revenue pulse</h2>
        </div>
        <div className="admin-kpi-grid">
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">MRR</span>
            <strong>{usd(pulse.mrr)}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">ARR</span>
            <strong>{usd(pulse.arr)}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">ARPA</span>
            <strong>{usd(pulse.arpa)}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Paying accounts</span>
            <strong>{pulse.payingAccounts}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">New MRR (30d)</span>
            <strong>{usd(pulse.newMrr30d)}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">MoM growth</span>
            <strong>
              {pulse.momGrowthPct >= 0 ? (
                <TrendingUp className="mr-1 inline h-3.5 w-3.5 text-[#00e676]" />
              ) : (
                <TrendingDown className="mr-1 inline h-3.5 w-3.5 text-red-400" />
              )}
              {pct(pulse.momGrowthPct)}
            </strong>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">{assumptions.note}</p>
      </section>

      {/* ---- Retention & churn ---- */}
      <div className="admin-grid-2">
        <section className="admin-panel app-panel">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-400" />
            <h2>Retention &amp; churn (est.)</h2>
          </div>
          <div className="admin-kpi-grid">
            <div className="admin-kpi app-panel admin-kpi-warn">
              <span className="admin-kpi-label">Logo churn</span>
              <strong>{pct(retention.logoChurnRate)}</strong>
            </div>
            <div className="admin-kpi app-panel admin-kpi-warn">
              <span className="admin-kpi-label">Revenue churn</span>
              <strong>{pct(retention.revenueChurnRate)}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">NRR (est.)</span>
              <strong>{pct(retention.nrrEstPct)}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">GRR (est.)</span>
              <strong>{pct(retention.grrEstPct)}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Churned accts (30d)</span>
              <strong>{retention.churnedAccounts30d}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Churned MRR (30d)</span>
              <strong>{usd(retention.churnedMrr30d)}</strong>
            </div>
          </div>
        </section>

        {/* ---- CFO / board ---- */}
        <section className="admin-panel app-panel">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <h2>CFO / board metrics</h2>
          </div>
          <div className="admin-kpi-grid">
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Net-new ARR</span>
              <strong>{usd(board.netNewArr)}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Gross margin</span>
              <strong>{pct(board.grossMarginPct)}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Rule of 40</span>
              <strong>{board.ruleOf40}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Burn multiple</span>
              <strong>{board.burnMultiple ?? "—"}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Cash runway</span>
              <strong>{board.cashRunwayMonths != null ? `${board.cashRunwayMonths} mo` : "—"}</strong>
            </div>
            <div className="admin-kpi app-panel">
              <span className="admin-kpi-label">Logo churn</span>
              <strong>{pct(board.logoChurnPct)}</strong>
            </div>
          </div>
          {!assumptions.cashConfigured && (
            <p className="mt-3 text-[11px] text-slate-500">
              Set MOTIVEFX_MONTHLY_BURN_USD and MOTIVEFX_CASH_BALANCE_USD to compute burn multiple &amp; runway.
            </p>
          )}
        </section>
      </div>

      {/* ---- MRR trend ---- */}
      <section className="admin-panel app-panel">
        <div className="mb-4 flex items-center gap-2">
          <LineChart className="h-4 w-4 text-slate-400" />
          <h2>MRR trend (12 months, est.)</h2>
        </div>
        <div className="flex h-32 items-end gap-2">
          {mrrTrend.map((m) => (
            <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="w-full rounded-t bg-[#00e676]/70"
                style={{ height: `${Math.max(4, (m.mrr / maxTrend) * 100)}%` }}
                title={`${m.month}: ${usd(m.mrr)} · ${m.accounts} accounts`}
              />
              <span className="text-[10px] text-slate-500">{m.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ---- Growth waterfall + subscription mix ---- */}
      <div className="admin-grid-2">
        <section className="admin-panel app-panel">
          <h2>Growth waterfall (6 months, est.)</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Starting</th>
                  <th>New</th>
                  <th>Churned</th>
                  <th>Ending</th>
                </tr>
              </thead>
              <tbody>
                {waterfall.map((w) => (
                  <tr key={w.month}>
                    <td>{w.month.slice(5)}</td>
                    <td>{usd(w.starting)}</td>
                    <td className="text-[#00e676]">{w.newMrr ? `+${usd(w.newMrr)}` : "—"}</td>
                    <td className="text-red-400">{w.churnedMrr ? usd(w.churnedMrr) : "—"}</td>
                    <td>
                      <strong>{usd(w.ending)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-panel app-panel">
          <h2>Subscription mix</h2>
          <BarList items={subscriptionMix} labelKey="status" valueKey="c" />
        </section>
      </div>

      {/* ---- Revenue by tier + by country ---- */}
      <div className="admin-grid-2">
        <section className="admin-panel app-panel">
          <h2>Revenue by tier</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tier</th>
                  <th>Accounts</th>
                  <th>MRR</th>
                </tr>
              </thead>
              <tbody>
                {byTier.map((t) => (
                  <tr key={t.tier}>
                    <td>
                      <strong>{t.label}</strong>
                    </td>
                    <td>{t.accounts}</td>
                    <td>{usd(t.mrr)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="admin-panel app-panel">
          <h2>MRR by country</h2>
          <BarList
            items={mrrByCountry.map((r) => ({ country: r.country, mrr: r.mrr }))}
            labelKey="country"
            valueKey="mrr"
          />
        </section>
      </div>

      {/* ---- Cohort retention ---- */}
      <section className="admin-panel app-panel">
        <h2>Cohort retention (by signup month)</h2>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Cohort</th>
                <th>Signups</th>
                <th>Active now (30d)</th>
                <th>Retention</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => (
                <tr key={c.month}>
                  <td>{c.month}</td>
                  <td>{c.signups}</td>
                  <td>{c.activeNow}</td>
                  <td>{pct(c.retentionPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Product KPIs ---- */}
      <section className="admin-panel app-panel">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-[#00e676]" />
          <h2>Product engagement</h2>
        </div>
        <div className="admin-kpi-grid">
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">DAU</span>
            <strong>{product.dau}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">WAU</span>
            <strong>{product.wau}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">MAU</span>
            <strong>{product.mau}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Stickiness (DAU/MAU)</span>
            <strong>{pct(product.stickiness)}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Bettors</span>
            <strong>{product.bettors}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Bet win rate</span>
            <strong>{pct(product.betWinRate)}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Predictors</span>
            <strong>{product.predictors}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Prediction accuracy</span>
            <strong>{pct(product.predAccuracy)}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Open positions</span>
            <strong>{product.openBets + product.openPreds}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Portfolios</span>
            <strong>{product.portfolios}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Watchlist items</span>
            <strong>{product.watchlistItems}</strong>
          </div>
          <div className="admin-kpi app-panel">
            <span className="admin-kpi-label">Alerts (unread)</span>
            <strong>
              {product.alertsTotal}
              <span className="text-slate-500"> ({product.alertsUnread})</span>
            </strong>
          </div>
        </div>
      </section>

      {/* ---- At-risk accounts ---- */}
      <section className="admin-panel app-panel">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h2>At-risk accounts</h2>
        </div>
        {atRisk.length === 0 ? (
          <p className="text-sm text-slate-400">No at-risk paying accounts detected.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Tier</th>
                  <th>MRR</th>
                  <th>Last seen</th>
                  <th>Signals</th>
                </tr>
              </thead>
              <tbody>
                {atRisk.map((r) => (
                  <tr key={r.email}>
                    <td className="mono">{r.email}</td>
                    <td>{r.tier}</td>
                    <td>{usd(r.mrr)}</td>
                    <td>{r.lastSeenAt ? new Date(r.lastSeenAt).toLocaleDateString() : "never"}</td>
                    <td>{r.reasons.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
