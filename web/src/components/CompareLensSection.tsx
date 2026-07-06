import { GitCompareArrows } from "lucide-react";

import type { CompareLensItem } from "../types";

import { useSignalDetail } from "../hooks/useSignalDetail";

import { compareLensDetail } from "../utils/signalIntel";



interface Props {

  items: CompareLensItem[];

}



export function CompareLensSection({ items }: Props) {

  const { inspectDetail } = useSignalDetail();



  if (!items.length) return null;



  return (

    <section className="home-section compare-lens-section">

      <div className="home-section-header">

        <h2>

          <GitCompareArrows size={18} /> Compare Lens

        </h2>

        <span className="home-section-sub">Current signal vs similar setups last week*</span>

      </div>

      <div className="compare-lens-grid">

        {items.map((item) => (

          <button

            key={item.id}

            type="button"

            className="compare-lens-card glass-card compare-lens-clickable"

            onClick={() => inspectDetail(compareLensDetail(item))}

            title={`Compare lens: ${item.symbol}`}

          >

            <div className="compare-lens-top">

              <strong>{item.symbol}</strong>

              <span className="compare-lens-mod">{item.module}</span>

            </div>

            <p className="compare-lens-title">{item.title}</p>

            <div className="compare-lens-bars">

              <div className="compare-bar-row">

                <span>Now</span>

                <div className="compare-bar-track">

                  <div className="compare-bar-fill now" style={{ width: `${item.currentConfidence}%` }} />

                </div>

                <span>{item.currentConfidence}%</span>

              </div>

              <div className="compare-bar-row">

                <span>7d avg</span>

                <div className="compare-bar-track">

                  <div className="compare-bar-fill prior" style={{ width: `${item.priorConfidence}%` }} />

                </div>

                <span>{item.priorConfidence}%</span>

              </div>

            </div>

            <p className="compare-lens-delta">{item.deltaLabel}</p>

            <p className="compare-lens-context">{item.context}</p>

          </button>

        ))}

      </div>

      <p className="home-scenario-footnote">*Historical context for education — not a forecast.</p>

    </section>

  );

}

