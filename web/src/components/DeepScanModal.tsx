import type { DeepScan } from "../types";

interface Props {
  scan: DeepScan | null;
  onDismiss: () => void;
}

const VERDICT_LABEL: Record<string, string> = {
  bullish: "Bullish sentiment",
  bearish: "Bearish sentiment",
  neutral: "Neutral trend",
};

export function DeepScanModal({ scan, onDismiss }: Props) {
  if (!scan) return null;

  const verdictClass =
    scan.verdict === "bullish" ? "verdict-bull" : scan.verdict === "bearish" ? "verdict-bear" : "verdict-neutral";
  const title = (scan.title || "Signal detail").trim();
  const headline = (scan.headline || scan.subject || "Market read unavailable").trim();
  const body =
    (scan.body || "").trim() ||
    "This signal did not return a full deep-scan narrative. Dismiss and try again, or open Why? on the card for context.";
  const conclusion = (scan.conclusion || "").trim();
  const action = (scan.action || "").trim() || "Informational scan";
  const confidence =
    typeof scan.confidence === "number" && Number.isFinite(scan.confidence)
      ? Math.max(0, Math.min(100, Math.round(scan.confidence)))
      : null;

  return (
    <div className="deep-scan-overlay" onClick={onDismiss}>
      <div className="deep-scan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deep-scan-label">{title}</div>
        <h2 className="deep-scan-headline">{headline}</h2>
        <p className="deep-scan-body">{body}</p>
        {conclusion ? (
          <p className={`deep-scan-conclusion ${verdictClass}`}>
            {VERDICT_LABEL[scan.verdict] ?? "Market read"}: {conclusion}
          </p>
        ) : (
          <p className="deep-scan-conclusion verdict-neutral">Market read: informational context only</p>
        )}
        <div className="deep-scan-meta">
          <span>Signal lens: {action}</span>
          <span>{confidence != null ? `${confidence}% signal strength` : "Signal strength unavailable"}</span>
        </div>
        <p className="deep-scan-disclaimer">Deep scan is informational only — not financial or gambling advice.</p>
        <button type="button" className="btn btn-primary deep-scan-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
