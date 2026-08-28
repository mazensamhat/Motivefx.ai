"use client";

import { Workflow } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";

export function OpsPipelines() {
  return (
    <OpsIntelSurface
      title="Data Pipelines"
      description="Raw → normalized → accepted/rejected · dead letters · latency"
      icon={Workflow}
      surface="pipelines"
      render={(data) => {
        const pipelines = data.pipelines as {
          id: string;
          label: string;
          rawRecords: number;
          normalized: number;
          accepted: number;
          rejected: number;
          duplicates: number;
          stale: number;
          schemaFailures: number;
          latencyMs: number | null;
          deadLetter: number;
        }[];
        return (
          <section className="ops-card">
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>Pipeline</th>
                    <th>Raw</th>
                    <th>Accepted</th>
                    <th>Rejected</th>
                    <th>Dupes</th>
                    <th>Stale</th>
                    <th>Schema</th>
                    <th>p95</th>
                    <th>DLQ</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelines.map((p) => (
                    <tr key={p.id}>
                      <td>{p.label}</td>
                      <td>{p.rawRecords.toLocaleString()}</td>
                      <td>{p.accepted.toLocaleString()}</td>
                      <td>{p.rejected}</td>
                      <td>{p.duplicates}</td>
                      <td>{p.stale}</td>
                      <td>{p.schemaFailures}</td>
                      <td>{p.latencyMs != null ? `${p.latencyMs}ms` : "—"}</td>
                      <td>{p.deadLetter}</td>
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
