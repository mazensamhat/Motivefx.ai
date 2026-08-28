"use client";

import { GitBranch } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsEvidenceQuality() {
  return (
    <OpsIntelSurface
      title="Evidence Quality"
      description="Supporting / counter / neutral · independence · contradictions"
      icon={GitBranch}
      surface="evidence"
      render={(data) => {
        const evidence = data.evidence as {
          totals: Record<string, number>;
          providers: { provider: string; count: number }[];
          contradictions: { symbol: string; detail: string }[];
          independenceNote: string;
        };
        return (
          <>
            <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(5, minmax(0,1fr))" }}>
              {(["supporting", "counter", "neutral", "live", "simulated"] as const).map((k) => (
                <article key={k} className="ops-kpi-card">
                  <span className="ops-kpi-label">{k}</span>
                  <strong className="ops-kpi-value">{evidence.totals[k] ?? 0}</strong>
                </article>
              ))}
            </div>
            <div className="ops-attention-grid">
              <section className="ops-card">
                <header className="ops-card-header">
                  <h3>By provider</h3>
                </header>
                <ul className="ops-freshness-list">
                  {evidence.providers.map((p) => (
                    <li key={p.provider}>
                      <span>{p.provider}</span>
                      <strong>{p.count}</strong>
                    </li>
                  ))}
                </ul>
                <p className="ops-muted" style={{ marginTop: 8 }}>
                  {evidence.independenceNote}
                </p>
              </section>
              <section className="ops-card">
                <header className="ops-card-header">
                  <h3>Evidence disagreement</h3>
                </header>
                {evidence.contradictions.length === 0 ? (
                  <p className="ops-muted">No elevated disagreements</p>
                ) : (
                  <ul className="ops-live-feed">
                    {evidence.contradictions.map((c, i) => (
                      <li key={`${c.symbol}-${i}`}>
                        <span className="ops-live-name">{c.symbol}</span>
                        <span className="ops-muted">{c.detail}</span>
                        <span className="ops-truth-badge warn">REVIEW</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </>
        );
      }}
    />
  );
}
