import {
  ChevronRight,
  Cpu,
  Crosshair,
  Globe2,
  Home,
  LineChart,
  ShieldCheck,
  Star,
} from "lucide-react";

export type TodaysSignalRow = {
  id: string;
  label: string;
  status: string;
  tone: "up" | "cool" | "down";
  icon: "home" | "cpu" | "chart" | "globe";
  hint?: string;
};

const ICONS = {
  home: Home,
  cpu: Cpu,
  chart: LineChart,
  globe: Globe2,
} as const;

const DEFAULT_ROWS: TodaysSignalRow[] = [
  { id: "housing", label: "Housing Momentum", status: "↑ Rising", tone: "up", icon: "home", hint: "Open theme detail" },
  { id: "ai", label: "AI Infrastructure", status: "↑ Accelerating", tone: "up", icon: "cpu", hint: "Open theme detail" },
  { id: "inflation", label: "Inflation", status: "↓ Cooling", tone: "cool", icon: "chart", hint: "Open theme detail" },
  { id: "china", label: "Chinese Demand", status: "↑ Improving", tone: "up", icon: "globe", hint: "Open theme detail" },
];

interface Props {
  confidencePct: number;
  newSignals: number;
  growingRisks: number;
  emerging: number;
  rows?: TodaysSignalRow[];
  onRowClick?: (row: TodaysSignalRow) => void;
  onConfidenceClick?: () => void;
  onFootClick?: (key: "signals" | "risks" | "emerging") => void;
}

/** Today's Signals glass card — terminal Daily Brief hero. */
export function TodaysSignalsCard({
  confidencePct,
  newSignals,
  growingRisks,
  emerging,
  rows = DEFAULT_ROWS,
  onRowClick,
  onConfidenceClick,
  onFootClick,
}: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(confidencePct)));
  const circumference = 2 * Math.PI * 54;
  const dash = (pct / 100) * circumference;

  return (
    <section className="todays-signals-card">
      <div className="todays-signals-head">
        <h3>Today&apos;s Signals</h3>
      </div>

      <div className="todays-signals-body">
        <ul className="todays-signals-list">
          {rows.map((row) => {
            const Icon = ICONS[row.icon] ?? Home;
            const interactive = Boolean(onRowClick);
            const hint = row.hint ?? "View detail";
            return (
              <li key={row.id}>
                <button
                  type="button"
                  className={`ts-row${interactive ? " is-interactive" : ""}`}
                  onClick={() => onRowClick?.(row)}
                  disabled={!interactive}
                  aria-label={`${row.label}, ${row.status}. ${hint}`}
                >
                  <span className="ts-icon">
                    <Icon size={16} aria-hidden />
                  </span>
                  <span className="ts-copy">
                    <span className="ts-label">{row.label}</span>
                    <span className="ts-hint">{hint}</span>
                  </span>
                  <span className={`ts-badge tone-${row.tone}`}>{row.status}</span>
                  {interactive && <ChevronRight className="ts-chevron" size={16} aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          className={`todays-signals-gauge${onConfidenceClick ? " is-interactive" : ""}`}
          onClick={() => onConfidenceClick?.()}
          disabled={!onConfidenceClick}
          aria-label={`Market Confidence ${pct}%. View score detail`}
        >
          <p className="ts-gauge-label">Market Confidence</p>
          <div className="ts-gauge-ring">
            <svg viewBox="0 0 140 140" aria-hidden>
              <circle className="ts-gauge-track" cx="70" cy="70" r="54" />
              <circle
                className="ts-gauge-value"
                cx="70"
                cy="70"
                r="54"
                strokeDasharray={`${dash} ${circumference}`}
                transform="rotate(-90 70 70)"
              />
            </svg>
            <strong>{pct}%</strong>
          </div>
          {onConfidenceClick && <span className="ts-gauge-hint">Tap for score detail</span>}
        </button>
      </div>

      <div className="todays-signals-foot">
        <button
          type="button"
          className={onFootClick ? "is-interactive" : undefined}
          onClick={() => onFootClick?.("signals")}
          disabled={!onFootClick}
        >
          <Crosshair size={16} aria-hidden />
          <strong>{newSignals}</strong>
          <span>New Signals</span>
        </button>
        <button
          type="button"
          className={onFootClick ? "is-interactive" : undefined}
          onClick={() => onFootClick?.("risks")}
          disabled={!onFootClick}
        >
          <ShieldCheck size={16} aria-hidden />
          <strong>{growingRisks}</strong>
          <span>Growing Risks</span>
        </button>
        <button
          type="button"
          className={onFootClick ? "is-interactive" : undefined}
          onClick={() => onFootClick?.("emerging")}
          disabled={!onFootClick}
        >
          <Star size={16} aria-hidden />
          <strong>{emerging}</strong>
          <span>Emerging Opportunity</span>
        </button>
      </div>
    </section>
  );
}
