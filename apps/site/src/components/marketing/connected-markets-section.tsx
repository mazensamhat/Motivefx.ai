"use client";

import { useState } from "react";
import { CONNECTED_NODES } from "@/lib/marketing-copy";

export function ConnectedMarketsSection() {
  const [active, setActive] = useState<(typeof CONNECTED_NODES)[number]["id"]>("oil");
  const node = CONNECTED_NODES.find((n) => n.id === active) ?? CONNECTED_NODES[0];

  return (
    <section id="relationship-graph" className="section-pad blueprint-section">
      <div className="mx-auto max-w-6xl px-4">
        <div className="section-header text-center mx-auto max-w-2xl">
          <p className="section-kicker">Relationship Graph™</p>
          <h2 className="section-title">Click A Signal. Watch The World Light Up.</h2>
          <p className="section-sub">
            This is the hero visual of MotiveFX — interactive cascades nobody else owns as a brand.
            Oil → shipping → inflation → freight → retail.
          </p>
        </div>

        <div className="connected-shell connected-shell-graph">
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
          <div className="connected-effects connected-effects-lit" role="tabpanel">
            <p className="connected-effects-label">When {node.label} moves, watch:</p>
            <ul>
              {node.connected.map((c, i) => (
                <li key={c} style={{ ["--lit-i" as string]: String(i) }}>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
