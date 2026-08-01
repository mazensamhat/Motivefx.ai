import { APP_MODULE_TO_BRAND } from "../brand/moduleBrand";
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
        const sym = detail?.symbol;
        const modKey = detail?.journalMeta?.module;
        const brand = modKey ? APP_MODULE_TO_BRAND[modKey] : undefined;
        const deepDiveModule =
          detail?.deepDiveModule ??
          (brand && brand !== "home"
            ? (brand as SignalDetailPayload["deepDiveModule"])
            : sym
              ? "trades"
              : undefined);
        const deepDiveRow =
          detail?.deepDiveRow ??
          (sym
            ? {
                symbol: sym,
                note: detail?.contextLines?.[0] ?? label,
                timestamp: new Date().toISOString(),
                id: `chip-${sym}-${label}`,
              }
            : undefined);
        inspectSignal(label, {
          ...detail,
          deepDiveModule,
          deepDiveRow,
        });
      }}
      title={`Learn about ${label}`}
    >
      {label}
    </button>
  );
}
