"use client";

import { Cpu } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsJobs() {
  return (
    <OpsIntelSurface
      title="Background Jobs"
      description="Last run · next run · duration · success · retries"
      icon={Cpu}
      surface="jobs"
      render={(data) => {
        const jobs = data.jobs as {
          id: string;
          label: string;
          lastRun: string | null;
          nextRun: string | null;
          durationMs: number | null;
          success: boolean | null;
          retries: number;
          failure: string | null;
          domain: string;
        }[];
        return (
          <section className="ops-card">
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Job</th>
                    <th>Domain</th>
                    <th>Last run</th>
                    <th>Next</th>
                    <th>Duration</th>
                    <th>Status</th>
                    <th>Retries</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((j) => (
                    <tr key={j.id}>
                      <td>{j.label}</td>
                      <td>{j.domain}</td>
                      <td className="text-xs">
                        {j.lastRun ? new Date(j.lastRun).toLocaleString() : "—"}
                      </td>
                      <td className="text-xs">
                        {j.nextRun ? new Date(j.nextRun).toLocaleString() : "—"}
                      </td>
                      <td>{j.durationMs != null ? `${j.durationMs}ms` : "—"}</td>
                      <td>
                        <span
                          className={`ops-intel-pill ${
                            j.success === true
                              ? "healthy"
                              : j.success === false
                                ? "critical"
                                : "unknown"
                          }`}
                        >
                          {j.success === true
                            ? "ok"
                            : j.success === false
                              ? j.failure ?? "fail"
                              : "no data"}
                        </span>
                      </td>
                      <td>{j.retries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      }}
    />
  );
}
