"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { FinancialSnapshot } from "@/lib/admin-financial-analytics";
import { countryDisplayName } from "@/lib/geo/continents";

type CountryRow = { country: string; count: number; pct: number };

export function OpsChartsRow({
  topCountries,
}: {
  topCountries: { country: string; c: number }[];
}) {
  const [financial, setFinancial] = useState<FinancialSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/financial", { cache: "no-store" });
      if (res.ok) setFinancial((await res.json()) as FinancialSnapshot);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const mrrTrend = financial?.mrrTrend ?? [];
  const maxMrr = Math.max(...mrrTrend.map((m) => m.mrr), 1);

  const tierMix = useMemo(() => {
    const tiers = financial?.byTier ?? [];
    const total = tiers.reduce((s, t) => s + t.accounts, 0) || 1;
    return tiers.map((t) => ({
      label: t.label,
      pct: Math.round((t.accounts / total) * 100),
      accounts: t.accounts,
    }));
  }, [financial?.byTier]);

  const countries: CountryRow[] = useMemo(() => {
    const total = topCountries.reduce((s, r) => s + r.c, 0) || 1;
    return topCountries.slice(0, 5).map((r) => ({
      country: r.country || "Unknown",
      count: r.c,
      pct: Math.round((r.c / total) * 100),
    }));
  }, [topCountries]);

  const donutColors = ["#00c853", "#26a69a", "#42a5f5", "#7e57c2", "#ff7043", "#90a4ae"];

  return (
    <div className="ops-charts-row">
      <section className="ops-card ops-chart-card ops-chart-wide">
        <header className="ops-card-header">
          <h3>MRR Overview</h3>
          <span className="ops-muted">Last 30 days</span>
        </header>
        {loading && !financial ? (
          <p className="ops-muted">Loading chart…</p>
        ) : (
          <div className="ops-area-chart-wrap">
            <svg className="ops-area-chart" viewBox="0 0 400 120" preserveAspectRatio="none">
              <defs>
                <linearGradient id="opsMrrFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00c853" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#00c853" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              {mrrTrend.length > 1 ? (
                <>
                  <path
                    fill="url(#opsMrrFill)"
                    d={`M 0 120 ${mrrTrend
                      .map((point, i) => {
                        const x = (i / (mrrTrend.length - 1)) * 400;
                        const y = 120 - (point.mrr / maxMrr) * 100;
                        return `L ${x} ${y}`;
                      })
                      .join(" ")} L 400 120 Z`}
                  />
                  <polyline
                    fill="none"
                    stroke="#00c853"
                    strokeWidth="2"
                    points={mrrTrend
                      .map((point, i) => {
                        const x = (i / (mrrTrend.length - 1)) * 400;
                        const y = 120 - (point.mrr / maxMrr) * 100;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                  />
                </>
              ) : (
                <line x1="0" y1="110" x2="400" y2="110" stroke="#e2e8f0" strokeWidth="2" />
              )}
            </svg>
            <div className="ops-chart-axis">
              <span>{mrrTrend[0]?.month ?? "—"}</span>
              <span>{mrrTrend[mrrTrend.length - 1]?.month ?? "—"}</span>
            </div>
          </div>
        )}
      </section>

      <section className="ops-card ops-chart-card">
        <header className="ops-card-header">
          <h3>Subscription Mix</h3>
        </header>
        <div className="ops-donut-wrap">
          <svg viewBox="0 0 120 120" className="ops-donut">
            {tierMix.length === 0 ? (
              <circle cx="60" cy="60" r="42" fill="none" stroke="#e2e8f0" strokeWidth="16" />
            ) : (
              tierMix.reduce(
                (acc, slice, index) => {
                  const start = acc.offset;
                  const portion = slice.pct / 100;
                  const end = start + portion;
                  const large = portion > 0.5 ? 1 : 0;
                  const x1 = 60 + 42 * Math.cos(2 * Math.PI * start - Math.PI / 2);
                  const y1 = 60 + 42 * Math.sin(2 * Math.PI * start - Math.PI / 2);
                  const x2 = 60 + 42 * Math.cos(2 * Math.PI * end - Math.PI / 2);
                  const y2 = 60 + 42 * Math.sin(2 * Math.PI * end - Math.PI / 2);
                  acc.paths.push(
                    <path
                      key={slice.label}
                      d={`M 60 60 L ${x1} ${y1} A 42 42 0 ${large} 1 ${x2} ${y2} Z`}
                      fill={donutColors[index % donutColors.length]}
                    />
                  );
                  acc.offset = end;
                  return acc;
                },
                { offset: 0, paths: [] as ReactNode[] }
              ).paths
            )}
            <circle cx="60" cy="60" r="26" fill="#fff" />
          </svg>
          <ul className="ops-donut-legend">
            {(tierMix.length ? tierMix : [{ label: "Free", pct: 100, accounts: 0 }]).map(
              (slice, index) => (
                <li key={slice.label}>
                  <span
                    className="ops-donut-swatch"
                    style={{ background: donutColors[index % donutColors.length] }}
                  />
                  {slice.label} {slice.pct}%
                </li>
              )
            )}
          </ul>
        </div>
      </section>

      <section className="ops-card ops-chart-card">
        <header className="ops-card-header">
          <h3>Top Countries</h3>
        </header>
        <ul className="ops-country-list">
          {countries.length === 0 ? (
            <li className="ops-muted">No signup geography yet</li>
          ) : (
            countries.map((row) => (
              <li key={row.country}>
                <span>{countryDisplayName(row.country)}</span>
                <div className="ops-country-bar">
                  <span style={{ width: `${Math.max(row.pct, 4)}%` }} />
                </div>
                <strong>{row.pct}%</strong>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
