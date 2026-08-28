"use client";

import { Target } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsCalibration() {
  return (
    <OpsIntelSurface
      title="Confidence Calibration"
      description="Predicted confidence vs observed reliability — score ≠ confidence"
      icon={Target}
      surface="calibration"
      render={(data) => {
        const cal = data.calibration as {
          note: string;
          evaluated: number;
          buckets: {
            bucket: string;
            sampleSize: number;
            observedReliability: number | null;
            warning: boolean;
          }[];
        };
        return (
          <>
            <p className="ops-muted">{cal.note}</p>
            <article className="ops-kpi-card" style={{ maxWidth: 200 }}>
              <span className="ops-kpi-label">Signals evaluated</span>
              <strong className="ops-kpi-value">{cal.evaluated}</strong>
            </article>
            <section className="ops-card">
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Predicted confidence</th>
                      <th>Samples</th>
                      <th>Observed reliability</th>
                      <th>Flag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cal.buckets.map((b) => (
                      <tr key={b.bucket}>
                        <td>{b.bucket}%</td>
                        <td>{b.sampleSize}</td>
                        <td>
                          {b.observedReliability != null ? `${b.observedReliability}%` : "— pending outcomes"}
                        </td>
                        <td>{b.warning ? <span className="ops-truth-badge warn">WATCH</span> : "—"}</td>
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
