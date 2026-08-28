"use client";

import { ScrollText } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsDailyBrief() {
  return (
    <OpsIntelSurface
      title="Daily Brief"
      description="Generation · validation · publishing · quality checks"
      icon={ScrollText}
      surface="brief"
      render={(data) => {
        const brief = data.brief as {
          latest: {
            date: string;
            generatedAt: string | null;
            signalsIncluded: number;
            signalsExcluded: number;
            providers: number;
            warnings: number;
            status: string;
          };
          qualityChecks: Record<string, number>;
          recentSymbols: string[];
        };
        return (
          <>
            <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
              <article className="ops-kpi-card">
                <span className="ops-kpi-label">Date</span>
                <strong className="ops-kpi-value" style={{ fontSize: "1rem" }}>
                  {brief.latest.date}
                </strong>
              </article>
              <article className="ops-kpi-card">
                <span className="ops-kpi-label">Signals in</span>
                <strong className="ops-kpi-value">{brief.latest.signalsIncluded}</strong>
              </article>
              <article className="ops-kpi-card">
                <span className="ops-kpi-label">Excluded</span>
                <strong className="ops-kpi-value">{brief.latest.signalsExcluded}</strong>
              </article>
              <article className="ops-kpi-card">
                <span className="ops-kpi-label">Providers</span>
                <strong className="ops-kpi-value">{brief.latest.providers}</strong>
              </article>
              <article className="ops-kpi-card">
                <span className="ops-kpi-label">Warnings</span>
                <strong className="ops-kpi-value">{brief.latest.warnings}</strong>
              </article>
            </div>
            <div className="ops-attention-grid">
              <section className="ops-card">
                <header className="ops-card-header">
                  <h3>Status</h3>
                </header>
                <p>
                  <span className="ops-intel-pill healthy">{brief.latest.status}</span>
                </p>
                <p className="ops-muted" style={{ marginTop: 8 }}>
                  Generated{" "}
                  {brief.latest.generatedAt
                    ? new Date(brief.latest.generatedAt).toLocaleString()
                    : "—"}
                </p>
                <div className="ops-gate-row" style={{ marginTop: 12 }}>
                  {brief.recentSymbols.map((s) => (
                    <span key={s} className="ops-gate-pill ok mono">
                      {s}
                    </span>
                  ))}
                </div>
              </section>
              <section className="ops-card">
                <header className="ops-card-header">
                  <h3>Quality checks</h3>
                </header>
                <ul className="ops-freshness-list">
                  {Object.entries(brief.qualityChecks).map(([k, v]) => (
                    <li key={k}>
                      <span>{k}</span>
                      <strong>{v}</strong>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </>
        );
      }}
    />
  );
}
