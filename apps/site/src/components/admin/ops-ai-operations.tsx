"use client";

import { Brain } from "lucide-react";
import { OpsIntelSurface } from "@/components/admin/ops-intel-surface";
import Link from "next/link";

export function OpsAiOperations() {
  return (
    <OpsIntelSurface
      title="AI Operations"
      description="Model registry · grounding · costs · never invent market facts"
      icon={Brain}
      surface="ai"
      render={(data) => {
        const ai = data.ai as {
          models: {
            feature: string;
            model: string;
            promptVersion: string;
            temperature: number;
            maxTokens: number;
            structuredSchema?: string;
            lastChangedAt: string;
            changedBy: string;
          }[];
          recentAiEvents: { eventId: string; eventName: string; observedAt: string; status?: string }[];
        };
        return (
          <>
            <p className="ops-muted">
              Cost metering lives on{" "}
              <Link href="/admin/ai-costs" className="ops-inline-link">
                AI Costs
              </Link>
              . Prompt changes require version + operator + rollback.
            </p>
            <section className="ops-card">
              <header className="ops-card-header">
                <h3>Model / prompt registry</h3>
              </header>
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>Feature</th>
                      <th>Model</th>
                      <th>Prompt</th>
                      <th>Temp</th>
                      <th>Max tokens</th>
                      <th>Schema</th>
                      <th>Changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ai.models.map((m) => (
                      <tr key={m.feature}>
                        <td>{m.feature}</td>
                        <td className="mono text-xs">{m.model}</td>
                        <td className="mono text-xs">{m.promptVersion}</td>
                        <td>{m.temperature}</td>
                        <td>{m.maxTokens}</td>
                        <td className="text-xs">{m.structuredSchema ?? "—"}</td>
                        <td className="text-xs">
                          {new Date(m.lastChangedAt).toLocaleDateString()} · {m.changedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="ops-card">
              <header className="ops-card-header">
                <h3>Recent AI telemetry</h3>
              </header>
              {ai.recentAiEvents.length === 0 ? (
                <p className="ops-muted">No AI events in process buffer yet</p>
              ) : (
                <ul className="ops-live-feed">
                  {ai.recentAiEvents.map((e) => (
                    <li key={e.eventId}>
                      <time>{new Date(e.observedAt).toLocaleTimeString()}</time>
                      <span className="ops-live-name">{e.eventName}</span>
                      <span className="ops-truth-badge live">{e.status ?? "ok"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        );
      }}
    />
  );
}
