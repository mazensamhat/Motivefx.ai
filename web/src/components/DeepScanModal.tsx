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

  return (
    <div className="deep-scan-overlay" onClick={onDismiss}>
      <div className="deep-scan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="deep-scan-label">{scan.title}</div>
        <h2 className="deep-scan-headline">{scan.headline}</h2>
        <p className="deep-scan-body">{scan.body}</p>
        <p className={`deep-scan-conclusion ${verdictClass}`}>
          {VERDICT_LABEL[scan.verdict] ?? "Market read"}: {scan.conclusion}
        </p>
        <div className="deep-scan-meta">
          <span>Signal lens: {scan.action}</span>
          <span>{scan.confidence}% signal strength</span>
        </div>
        <p className="deep-scan-disclaimer">Deep scan is informational only — not financial or gambling advice.</p>
        <button className="btn btn-primary deep-scan-dismiss" onClick={onDismiss}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
