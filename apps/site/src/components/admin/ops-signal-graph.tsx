"use client";

import { Network } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsSignalGraph() {
  return (
    <OpsIntelSurface
      title="Signal Graph"
      description="Nodes · relationships · stale cascades · relationship strength"
      icon={Network}
      surface="graph"
      render={(data) => {
        const graph = data.graph as {
          totals: Record<string, number>;
          relationships: {
            from: string;
            to: string;
            strength: number;
            evidence: number;
            stale: boolean;
          }[];
        };
        return (
          <>
            <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(4, minmax(0,1fr))" }}>
              {Object.entries(graph.totals).map(([k, v]) => (
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
                      <th>From</th>
                      <th>To</th>
                      <th>Strength</th>
                      <th>Evidence</th>
                      <th>Stale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {graph.relationships.map((r, i) => (
                      <tr key={`${r.from}-${r.to}-${i}`}>
                        <td className="mono">{r.from}</td>
                        <td className="mono">{r.to}</td>
                        <td>{r.strength}%</td>
                        <td>{r.evidence}</td>
                        <td>{r.stale ? "YES" : "No"}</td>
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
