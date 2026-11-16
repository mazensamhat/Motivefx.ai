"use client";

import { Target } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";
import type { summarizePendingOutcomeCoverage } from "@/lib/ops/outcome-policy";

const reasonLabels: Record<string, string> = {
  invalid_prediction: "Invalid frozen prediction",
  not_due: "Horizon not reached",
  market_unverified: "Market provenance unverified",
  unsupported_market: "Market not supported by evaluator",
  provider_disabled: "Historical provider disabled",
  unsupported_symbol: "Historical symbol unavailable",
  ready_for_provider_check: "Ready for historical provider check",
};

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
          availability?: "available" | "unavailable";
          evaluated: number | null;
          pendingByVersion?: Record<string, number> | null;
          pendingEligibilitySample?: (ReturnType<typeof summarizePendingOutcomeCoverage> & {
            note: string;
          }) | null;
          buckets: {
            bucket: string;
            sampleSize: number;
            observedReliability: number | null;
            warning: boolean;
          }[];
        };
        if (cal.availability === "unavailable") {
          return <p className="ops-muted" role="alert">{cal.note} Use Refresh to retry.</p>;
        }
        return (
          <>
            <p className="ops-muted">{cal.note}</p>
            <article className="ops-kpi-card" style={{ maxWidth: 200 }}>
              <span className="ops-kpi-label">Signals evaluated</span>
              <strong className="ops-kpi-value">{cal.evaluated ?? "Unknown"}</strong>
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
            {cal.pendingByVersion && cal.pendingEligibilitySample && (
              <section className="ops-card">
                <header className="ops-card-header"><h3>Pending outcomes by evaluator</h3></header>
                <p className="ops-muted">{cal.pendingEligibilitySample.note}</p>
                <div className="ops-table-wrap">
                  <table className="ops-table">
                    <thead><tr><th>Evaluator</th><th>Total pending</th><th>Sampled</th><th>Past snapshot horizon in sample</th><th>Readiness in sample</th></tr></thead>
                    <tbody>
                      {Object.entries(cal.pendingByVersion).map(([version, total]) => {
                        const sample = cal.pendingEligibilitySample?.byVersion[version];
                        return (
                          <tr key={version}>
                            <td>{version}</td><td>{total}</td><td>{sample?.sampled ?? 0}</td>
                            <td>{sample ? sample.pastSnapshotHorizon : "Not sampled"}</td>
                            <td>{sample ? Object.entries(sample.reasons).filter(([, count]) => count > 0).map(([reason, count]) => (
                              <div key={reason}>{reasonLabels[reason] ?? reason}: {count}</div>
                            )) : "Unknown"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        );
      }}
    />
  );
}
