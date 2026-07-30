"use client";

import { useState } from "react";
import { CONNECTED_NODES } from "@/lib/marketing-copy";

export function ConnectedMarketsSection() {
  const [active, setActive] = useState<(typeof CONNECTED_NODES)[number]["id"]>("rates");
  const node = CONNECTED_NODES.find((n) => n.id === active) ?? CONNECTED_NODES[0];

  return (
    <section className="section-pad blueprint-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Relationship Engine™</p>
          <h2 className="section-title">Markets Are Connected.</h2>
          <p className="section-sub">
            Everything influences everything. Click a node — watch second- and third-order effects light up.
          </p>
        </div>

        <div className="connected-shell">
          <div className="connected-nodes" role="tablist" aria-label="Market nodes">
            {CONNECTED_NODES.map((n) => (
              <button
                key={n.id}
                type="button"
                role="tab"
                aria-selected={n.id === active}
                className={`connected-node ${n.id === active ? "active" : ""}`}
                onClick={() => setActive(n.id)}
              >
                {n.label}
              </button>
            ))}
          </div>
          <div className="connected-effects" role="tabpanel">
            <p className="connected-effects-label">When {node.label} moves, watch:</p>
            <ul>
              {node.connected.map((c) => (
                <li key={c}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
