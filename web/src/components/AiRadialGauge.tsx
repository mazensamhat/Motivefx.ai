import { formatMotiveSignalScore, resolveMotiveRating, type MotiveRatingContext } from "../utils/motiveRating";

interface Props {
  value: number;
  action?: string;
  /** advisor = Motive Signal ring · winrate = hero calculated win-rate (green) */
  variant?: "advisor" | "winrate";
  context?: MotiveRatingContext;
}

export function AiRadialGauge({
  value,
  action: _action = "hold",
  variant = "advisor",
  context: _context = "markets",
}: Props) {
  const pct = Math.min(100, Math.max(0, Math.round(value)));
  const isWinRate = variant === "winrate";
  const r = isWinRate ? 36 : 28;
  const size = isWinRate ? 88 : 96;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;
  const strokeColor = isWinRate ? "#00E676" : "var(--gauge-color, var(--module-accent))";

  return (
    <div
      className={`ai-radial-gauge ${isWinRate ? "ai-radial-gauge-winrate" : "ai-radial-gauge-advisor"}`}
      style={{
        width: size,
        height: size,
        ["--gauge-color" as string]: strokeColor,
      }}
    >
      <svg viewBox="0 0 96 96" className="ai-radial-svg" aria-hidden>
        <circle cx="48" cy="48" r={r} className="ai-radial-track" />
        <circle
          cx="48"
          cy="48"
          r={r}
          className="ai-radial-progress"
          stroke={strokeColor}
          strokeWidth={6}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="ai-radial-center">
        {!isWinRate ? (
          <>
            <span className="ai-radial-pct ai-radial-pct-signal">{pct}</span>
            <span className="ai-radial-scale">/ 100</span>
          </>
        ) : (
          <span className="ai-radial-pct ai-radial-pct-win">{pct}%</span>
        )}
      </div>
    </div>
  );
}

export { formatMotiveSignalScore, resolveMotiveRating };
