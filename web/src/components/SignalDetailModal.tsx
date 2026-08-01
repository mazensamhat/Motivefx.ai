import type { MouseEvent } from "react";
import { BookOpen, ListChecks, LayoutPanelTop, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { RelatedWatchItem, SignalDetailPayload } from "../utils/signalIntel";
import { formatSignalShareText } from "../utils/shareSignal";
import { useAssetDeepDiveOptional } from "../hooks/useAssetDeepDive";
import { IntelActionBar } from "./IntelActionBar";

interface Props extends SignalDetailPayload {
  onClose: () => void;
}

export function SignalDetailModal({
  title,
  category,
  definition,
  example,
  contextLines,
  nextSteps,
  relatedWatches,
  symbol,
  confidence,
  journalNote,
  journalMeta,
  deepDiveModule,
  deepDiveRow,
  onClose,
}: Props) {
  const deepDive = useAssetDeepDiveOptional();
  const shareText = formatSignalShareText({
    title,
    category,
    definition,
    contextLines,
    symbol,
    confidence,
  });

  const canOpenScorecard =
    Boolean(deepDive) &&
    Boolean(deepDiveModule) &&
    Boolean(deepDiveRow || symbol);

  function openScorecardAfterClose(row: Record<string, unknown>, module: NonNullable<SignalDetailPayload["deepDiveModule"]>) {
    onClose();
    window.setTimeout(() => {
      deepDive?.openDeepDive(row, module);
    }, 0);
  }

  function openFullScorecard(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (!deepDive || !deepDiveModule) return;
    const row =
      deepDiveRow ??
      ({
        symbol,
        timestamp: new Date().toISOString(),
        note: title,
      } as Record<string, unknown>);
    openScorecardAfterClose(row, deepDiveModule);
  }

  function openWatch(e: MouseEvent<HTMLButtonElement>, w: RelatedWatchItem) {
    e.stopPropagation();
    if (!deepDive) return;
    openScorecardAfterClose(w.deepDiveRow, w.deepDiveModule);
  }

  return createPortal(
    <div className="modal-overlay signal-detail-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="signal-detail-modal glass-card" onClick={(e) => e.stopPropagation()}>
        <header className="signal-detail-header">
          <div>
            <span className="signal-detail-label">
              <BookOpen size={14} /> Signal intel
            </span>
            <h3>
              {symbol ? `$${symbol} · ` : ""}
              {title}
            </h3>
            <span className="signal-detail-cat">{category}</span>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <p className="signal-detail-howto">
          Plain-English explainer. Scroll for related watches — tap any to open the same full scorecard you get on holdings.
        </p>

        {confidence != null && (
          <p className="signal-detail-confidence">
            Desk attention: <strong>{confidence}%</strong> — how loud the feeds are, not a prediction.
          </p>
        )}

        {canOpenScorecard && (
          <button type="button" className="signal-detail-scorecard-btn" onClick={openFullScorecard}>
            <LayoutPanelTop size={16} />
            Open full {symbol ? `$${symbol} ` : ""}scorecard
            <span>Plain English · health · tips · estimates</span>
          </button>
        )}

        <section className="signal-detail-section">
          <h4 className="signal-detail-section-title">What it means</h4>
          <p className="signal-detail-def">{definition}</p>
          {example && <p className="signal-detail-example">Example: {example}</p>}
        </section>

        {contextLines && contextLines.length > 0 && (
          <section className="signal-detail-section">
            <h4 className="signal-detail-section-title">
              {symbol ? `Why it showed up for $${symbol}` : "Why it showed up"}
            </h4>
            <ul className="signal-detail-context">
              {contextLines.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        {relatedWatches && relatedWatches.length > 0 && (
          <section className="signal-detail-section">
            <h4 className="signal-detail-section-title">Related watches</h4>
            <p className="signal-detail-watches-lead">
              Cross-desk names tied to this story. Stance labels are attention lean — not trade orders.
            </p>
            <ul className="signal-detail-watches">
              {relatedWatches.map((w) => (
                <li key={`${w.desk}-${w.symbol}`}>
                  <button
                    type="button"
                    className="signal-detail-watch-btn"
                    onClick={(e) => openWatch(e, w)}
                    disabled={!deepDive}
                  >
                    <span className="signal-detail-watch-top">
                      <strong>
                        {w.symbol.length <= 14 ? `$${w.symbol}` : w.symbol}
                      </strong>
                      <em>{w.desk}</em>
                    </span>
                    <span className="signal-detail-watch-stance">
                      {w.stanceLabel} · {w.attention}% attention
                    </span>
                    <span className="signal-detail-watch-blurb">{w.blurb}</span>
                    <span className="signal-detail-watch-cta">Open scorecard →</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {nextSteps && nextSteps.length > 0 && (
          <section className="signal-detail-section">
            <h4 className="signal-detail-section-title">
              <ListChecks size={14} /> What to do next (research)
            </h4>
            <ol className="signal-detail-next">
              {nextSteps.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ol>
          </section>
        )}

        {canOpenScorecard && (
          <button type="button" className="signal-detail-scorecard-btn is-secondary" onClick={openFullScorecard}>
            <LayoutPanelTop size={16} />
            Continue to full scorecard
          </button>
        )}

        <IntelActionBar
          shareText={shareText}
          journalNote={journalNote ?? shareText.split("\n").slice(0, 3).join(" · ")}
          journalMeta={journalMeta}
        />

        <p className="signal-detail-footer">Educational intel only — not financial advice. Monitor only.</p>
      </div>
    </div>,
    document.body
  );
}
