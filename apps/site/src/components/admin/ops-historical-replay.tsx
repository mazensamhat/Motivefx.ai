"use client";

import { History } from "lucide-react";

const PERIODS = [
  "COVID crash",
  "2022 inflation shock",
  "Regional banking crisis",
  "Oil shock",
  "Major Fed pivot",
  "AI boom",
  "Crypto selloff",
];

export function OpsHistoricalReplay() {
  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <History className="h-5 w-5" />
        </div>
        <div>
          <h2>Historical Replay</h2>
          <p>
            Replay market periods through the signal engine using only information available at that
            timestamp (look-ahead bias protection)
          </p>
        </div>
      </header>
      <section className="ops-card">
        <p className="ops-muted" style={{ marginBottom: 12 }}>
          Replay runner wires to durable historical bars + <code className="mono">availableAt</code>{" "}
          gates. UI contract is live; execution queue lands with P3 storage.
        </p>
        <div className="ops-provider-grid">
          {PERIODS.map((p) => (
            <article key={p} className="ops-provider-card">
              <strong>{p}</strong>
              <p className="ops-muted" style={{ marginTop: 6 }}>
                Look-ahead protected · queued
              </p>
              <button type="button" className="ops-toolbar-btn" style={{ marginTop: 8 }} disabled>
                Queue replay
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
