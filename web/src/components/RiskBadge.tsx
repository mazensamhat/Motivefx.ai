import { useSignalDetail } from "../hooks/useSignalDetail";
import { resolveRiskDetail } from "../utils/signalIntel";

interface Props {
  level: string;
  label?: string;
  context?: string;
  className?: string;
}

export function RiskBadge({ level, label, context, className = "risk-badge" }: Props) {
  const { inspectDetail } = useSignalDetail();
  const display = label ?? `${level} risk`;

  return (
    <button
      type="button"
      className={`${className} risk-${level} risk-badge-clickable`.trim()}
      onClick={(e) => {
        e.stopPropagation();
        inspectDetail(resolveRiskDetail(level, context));
      }}
      title={`Learn about ${display}`}
    >
      {display}
    </button>
  );
}
