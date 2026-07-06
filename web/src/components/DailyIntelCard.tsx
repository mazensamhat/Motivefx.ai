import { Copy, Share2 } from "lucide-react";
import { useState } from "react";
import type { HomeBriefing } from "../types";
import { Stars } from "./AiExplainModal";
import { useSignalDetail } from "../hooks/useSignalDetail";
import { formatSignalStrength } from "../config/productCopy";
import { homeScoreDetail } from "../utils/signalIntel";

interface Props {
  briefing: HomeBriefing;
}

export function DailyIntelCard({ briefing: b }: Props) {
  const [copied, setCopied] = useState(false);
  const { inspectDetail } = useSignalDetail();
  const top = b.opportunities[0];

  const text = [
    "MotiveFX Daily Intel",
    `Score: ${b.motivfxScore}/100 · ${b.marketConfidence} confidence`,
    top ? `Top signal: ${top.symbol} — ${top.title} (${formatSignalStrength(top.confidence)})` : "",
    `Risk watch: ${b.biggestRisk}`,
    `Tip: ${b.topAiTip}`,
    "",
    "Informational only · Not financial advice · motivefx.ai",
  ]
    .filter(Boolean)
    .join("\n");

  async function copyIntel() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function shareIntel() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "MotiveFX Daily Intel", text });
        return;
      } catch {
        /* fall through */
      }
    }
    copyIntel();
  }

  return (
    <section className="daily-intel-card glass-card">
      <div className="daily-intel-header">
        <div>
          <span className="daily-intel-label">Today&apos;s Intel Card</span>
          <button
            type="button"
            className="daily-intel-score-link"
            onClick={() => inspectDetail(homeScoreDetail(b.motivfxScore, b.marketConfidence, b.stars))}
            title="Learn about MotiveFX Score"
          >
            <h3>MotiveFX Score {b.motivfxScore}</h3>
          </button>
          <Stars count={b.stars} />
        </div>
        <div className="daily-intel-actions">
          <button type="button" className="btn btn-sm btn-ghost" onClick={copyIntel}>
            <Copy size={14} />
            {copied ? "Copied" : "Copy"}
          </button>
          <button type="button" className="btn btn-sm btn-accent-terminal" onClick={shareIntel}>
            <Share2 size={14} />
            Share
          </button>
        </div>
      </div>
      <div className="daily-intel-body">
        {top && (
          <p>
            <strong>Top signal:</strong> {top.symbol} — {top.title}{" "}
            <span className="daily-intel-muted">({formatSignalStrength(top.confidence)})</span>
          </p>
        )}
        <p><strong>Risk lens:</strong> {b.biggestRisk}</p>
        <p className="daily-intel-tip">{b.topAiTip}</p>
      </div>
      <p className="daily-intel-footer">{b.scenarioDisclaimer ?? "Informational only — not financial advice."}</p>
    </section>
  );
}
