"use client";

import { Radar } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsOpportunityRadar() {
  return (
    <OpsIntelSurface
      title="Opportunity Radar"
      description="Detected opportunities · confidence · strengthening / weakening"
      icon={Radar}
      surface="radar"
      render={(data) => {
        const radar = data.radar as {
          totals: Record<string, number>;
          opportunities: {
            id: string;
            symbol: string;
            signal: number;
            confidence: number;
            status: string;
            evidenceSupporting: number;
            evidenceTotal: number;
            horizon: string;
          }[];
        };
        return (
          <>
            <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
              {Object.entries(radar.totals).map(([k, v]) => (
                <article key={k} className="ops-kpi-card">
                  <span className="ops-kpi-label">{k}</span>
                  <strong className="ops-kpi-value">{v}</strong>
                </article>
              ))}
            </div>
            <section className="ops-card">
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Signal</th>
                      <th>Confidence</th>
                      <th>Status</th>
                      <th>Evidence</th>
                      <th>Horizon</th>
                    </tr>
                  </thead>
                  <tbody>
                    {radar.opportunities.map((o) => (
                      <tr key={o.id}>
                        <td className="mono">{o.symbol}</td>
                        <td>{o.signal}</td>
                        <td>{o.confidence}%</td>
                        <td>{o.status}</td>
                        <td>
                          {o.evidenceSupporting}/{o.evidenceTotal}
                        </td>
                        <td>{o.horizon}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        );
      }}
    />
  );
}
