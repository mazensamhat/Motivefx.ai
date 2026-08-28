"use client";

import { Dna } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsMarketDna() {
  return (
    <OpsIntelSurface
      title="Market DNA"
      description="Asset personality · drivers · regime · drift monitoring"
      icon={Dna}
      surface="dna"
      render={(data) => {
        const dna = data.dna as {
          totals: Record<string, number>;
          profiles: {
            asset: string;
            version: string;
            lastUpdated: string;
            primaryDrivers: string[];
            confidence: number;
            currentRegime: string;
            signal: number | null;
          }[];
          driftNote: string;
        };
        return (
          <>
            <div className="ops-kpi-row" style={{ gridTemplateColumns: "repeat(2, minmax(0,1fr))" }}>
              <article className="ops-kpi-card">
                <span className="ops-kpi-label">Profiles</span>
                <strong className="ops-kpi-value">{dna.totals.profiles}</strong>
              </article>
              <article className="ops-kpi-card">
                <span className="ops-kpi-label">Material drift</span>
                <strong className="ops-kpi-value">{dna.totals.materialDrift}</strong>
              </article>
            </div>
            <p className="ops-muted">{dna.driftNote}</p>
            <section className="ops-card">
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Asset</th>
                      <th>Signal</th>
                      <th>Regime</th>
                      <th>Drivers</th>
                      <th>Confidence</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dna.profiles.map((p) => (
                      <tr key={p.asset}>
                        <td className="mono">{p.asset}</td>
                        <td>{p.signal ?? "—"}</td>
                        <td>{p.currentRegime}</td>
                        <td className="text-xs">{p.primaryDrivers.join(", ") || "—"}</td>
                        <td>{p.confidence}%</td>
                        <td>{new Date(p.lastUpdated).toLocaleString()}</td>
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
