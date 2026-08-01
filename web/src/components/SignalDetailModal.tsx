import { BookOpen, ListChecks, X } from "lucide-react";
import { createPortal } from "react-dom";
import type { SignalDetailPayload } from "../utils/signalIntel";
import { formatSignalShareText } from "../utils/shareSignal";
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
  symbol,
  confidence,
  journalNote,
  journalMeta,
  onClose,
}: Props) {
  const shareText = formatSignalShareText({
    title,
    category,
    definition,
    contextLines,
    symbol,
    confidence,
  });

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

        {confidence != null && (
          <p className="signal-detail-confidence">
            Desk attention: <strong>{confidence}%</strong> — how loud the feeds are, not a prediction.
          </p>
        )}

        <section className="signal-detail-section">
          <h4 className="signal-detail-section-title">What it is</h4>
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
