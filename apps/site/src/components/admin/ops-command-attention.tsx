"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CommandAttentionPayload } from "@/lib/ops/attention";

export function OpsCommandAttention() {
  const [data, setData] = useState<CommandAttentionPayload | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/command", { cache: "no-store" });
      if (res.ok) setData((await res.json()) as CommandAttentionPayload);
    } catch {
      /* non-blocking */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!data) return null;

  const overallLabel =
    data.overall === "healthy" ? "HEALTHY" : data.overall === "critical" ? "CRITICAL" : "DEGRADED";

  return (
    <section className="ops-command-block">
      <div className="ops-command-status">
        <div>
          <p className="ops-command-eyebrow">MotiveFX Ops · {data.environment.toUpperCase()}</p>
          <p className={`ops-command-overall ${data.overall}`}>
            <span className="ops-command-dot" aria-hidden />
            {overallLabel}
          </p>
          <p className="ops-muted">
            Market Intelligence · {data.attentionCount} thing
            {data.attentionCount === 1 ? "" : "s"} require attention · Last refreshed{" "}
            {new Date(data.generatedAt).toLocaleTimeString()} · Mode {data.dataMode}
          </p>
        </div>
      </div>

      <div className="ops-attention-grid">
        <div className="ops-card">
          <header className="ops-card-header">
            <h3>Attention</h3>
          </header>
          <ul className="ops-attention-list">
            {data.items.map((item) => (
              <li key={item.id} className={`ops-attention-item ${item.severity}`}>
                <span className="ops-attention-mark" aria-hidden>
                  {item.severity === "ok" ? "✓" : "⚠"}
                </span>
                <div>
                  {item.href ? (
                    <Link href={item.href}>{item.title}</Link>
                  ) : (
                    <span>{item.title}</span>
                  )}
                  {item.detail ? <p className="ops-muted">{item.detail}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="ops-card">
          <header className="ops-card-header">
            <h3>Intelligence Health</h3>
          </header>
          <ul className="ops-intel-health">
            {data.intelligence.map((row) => (
              <li key={row.id}>
                <Link href={row.href}>{row.label}</Link>
                <span className={`ops-intel-pill ${row.status}`}>{row.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
