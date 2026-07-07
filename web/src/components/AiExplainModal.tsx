import { HelpCircle, X } from "lucide-react";
import { createPortal } from "react-dom";
import { SignalChip } from "./SignalChip";
import { IntelActionBar } from "./IntelActionBar";
import { formatSignalShareText } from "../utils/shareSignal";
import {
  MOTIVE_RATING_DISCLAIMER,
  formatMotiveSignalScore,
  formatSignalReasons,
  resolveMotiveRating,
  sentimentBadgeClass,
  type MotiveRatingContext,
} from "../utils/motiveRating";

interface Props {
  title: string;
  symbol?: string;
  confidence: number;
  reasons: string[];
  signals?: string[];
  action?: string;
  ratingContext?: MotiveRatingContext;
  module?: string;
  onClose: () => void;
}

export function AiExplainModal({
  title,
  symbol,
  confidence,
  reasons,
  signals,
  action = "hold",
  ratingContext = "markets",
  module,
  onClose,
}: Props) {
  const rating = resolveMotiveRating(action, confidence, ratingContext);
  const displayReasons = formatSignalReasons(signals ?? [], reasons.join(". "), 8, reasons);

  const shareText = formatSignalShareText({
    title,
    symbol,
    confidence,
    definition:
      "AI cross-references options flow, insider activity, volume, news, and holdings context. Informational only.",
    reasons: displayReasons,
    category: "Why this signal?",
  });

  const journalNote = [
    symbol ? `$${symbol}` : null,
    title,
    `${rating.label} · ${formatMotiveSignalScore(rating.score)}`,
    displayReasons[0],
  ]
    .filter(Boolean)
    .join(" · ");

  return createPortal(
    <div className="modal-overlay ai-explain-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ai-explain-modal glass-card" onClick={(e) => e.stopPropagation()}>        <div className="ai-explain-header">
          <div>
            <span className="ai-explain-label">Why this signal?</span>
            <h3>{symbol ? `$${symbol} · ` : ""}{title}</h3>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="ai-explain-rating-block">
          <span className="ai-explain-rating-kicker">Motive Signal</span>
          <div className="ai-explain-rating-row">
            <strong className="ai-explain-rating-score">{formatMotiveSignalScore(rating.score)}</strong>
            <span className={`ai-explain-rating-sentiment ${sentimentBadgeClass(rating.tier)}`}>
              {rating.label}
            </span>
          </div>
        </div>
        <div className="ai-explain-confidence">
          <HelpCircle size={14} />
          Algorithmic signal strength — not a prediction or recommendation.
        </div>
        <p className="ai-explain-reasons-label">Why this score</p>
        <ul className="ai-explain-list motive-reason-list">
          {displayReasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
        {signals && signals.length > 0 && (
          <>
            <p className="ai-explain-reasons-label ai-explain-signals-label">Data inputs flagged</p>
            <div className="ai-explain-signals ai-explain-signals-foot">
              {signals.map((s) => (
                <SignalChip
                  key={s}
                  label={s}
                  className="signal-tag"
                  detail={{ symbol, confidence }}
                />
              ))}
            </div>
          </>
        )}

        <IntelActionBar
          shareText={shareText}
          journalNote={journalNote}
          journalMeta={{ module, symbol, signalTitle: title }}
        />

        <p className="ai-explain-footer">{MOTIVE_RATING_DISCLAIMER}</p>
      </div>
    </div>,
    document.body
  );
}
function Stars({ count }: { count: number }) {
  return (
    <span className="star-rating" aria-label={`${count} of 5 stars`}>
      {"★".repeat(count)}
      <span className="star-dim">{"★".repeat(5 - count)}</span>
    </span>
  );
}

export { Stars };
