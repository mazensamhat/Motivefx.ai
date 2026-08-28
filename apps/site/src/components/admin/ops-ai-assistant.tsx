"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

const PRESETS = [
  "What requires attention right now?",
  "Why did signal-generation volume change?",
  "Which provider is responsible for latency?",
  "Show signals with weak evidence but high score",
  "Is any demo data in the production signal path?",
];

export function OpsAiAssistant() {
  const [q, setQ] = useState(PRESETS[0]!);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ask() {
    setLoading(true);
    setAnswer(null);
    try {
      const [command, truth, incidents] = await Promise.all([
        fetch("/api/admin/command", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/admin/market-truth", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
        fetch("/api/admin/incidents", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      ]);

      const lines: string[] = [
        "Ops AI Assistant — grounded on structured Ops APIs only (no invented metrics).",
        "",
      ];

      if (command) {
        lines.push(
          `Overall: ${command.overall?.toUpperCase()} · ${command.attentionCount} attention item(s) · mode ${command.dataMode}`
        );
        for (const item of (command.items ?? []).slice(0, 5)) {
          lines.push(`• [${item.severity}] ${item.title}${item.detail ? ` — ${item.detail}` : ""}`);
        }
        lines.push("");
      }

      if (truth) {
        lines.push(
          `Market Truth: G1 ${truth.golden?.ok ? "PASS" : "FAIL"} · demoInSignal=${truth.contamination?.demoInSignal} · synthetic=${truth.contamination?.syntheticInSignal}`
        );
        lines.push("");
      }

      if (incidents) {
        lines.push(`Incidents open: ${incidents.open} · critical: ${incidents.critical}`);
      }

      lines.push("");
      lines.push(`Question: ${q}`);
      lines.push(
        "Answer: Use Attention + Market Truth + Incidents above. For symbol-level why, open Intelligence Debugger."
      );

      setAnswer(lines.join("\n"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="ops-page">
      <header className="ops-page-header">
        <div className="ops-page-icon">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h2>AI Ops Assistant</h2>
          <p>Retrieves structured operational evidence and explains it — never invents metrics</p>
        </div>
      </header>

      <section className="ops-card">
        <div className="ops-filter-row" style={{ marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p} type="button" className="ops-toolbar-btn" onClick={() => setQ(p)}>
              {p.slice(0, 42)}…
            </button>
          ))}
        </div>
        <textarea
          className="ops-truth-input"
          style={{ width: "100%", minHeight: 80, marginBottom: 8 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="ops-toolbar-btn" onClick={() => void ask()} disabled={loading}>
          {loading ? "Gathering evidence…" : "Ask Ops"}
        </button>
        {answer ? (
          <pre className="ops-assistant-answer" style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
            {answer}
          </pre>
        ) : null}
      </section>
    </section>
  );
}
