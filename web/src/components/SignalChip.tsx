import { useSignalDetail } from "../hooks/useSignalDetail";
import type { SignalDetailPayload } from "../utils/signalIntel";

interface Props {
  label: string;
  className?: string;
  detail?: Partial<SignalDetailPayload>;
}

export function SignalChip({ label, className = "", detail }: Props) {
  const { inspectSignal } = useSignalDetail();

  return (
    <button
      type="button"
      className={`signal-chip signal-chip-clickable ${className}`.trim()}
      onClick={(e) => {
        e.stopPropagation();
        inspectSignal(label, detail);
      }}
      title={`Learn about ${label}`}
    >
      {label}
    </button>
  );
}
