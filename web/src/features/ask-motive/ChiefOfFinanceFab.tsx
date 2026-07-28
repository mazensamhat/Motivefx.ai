import { Sparkles } from "lucide-react";

interface Props {
  onClick: () => void;
}

export function ChiefOfFinanceFab({ onClick }: Props) {
  return (
    <button
      type="button"
      className="chief-fab"
      onClick={onClick}
      aria-label="Open Your A.I. Chief of Finance"
      title="Your A.I. Chief of Finance"
    >
      <Sparkles size={20} aria-hidden />
      <span className="chief-fab-label">Ask AI</span>
    </button>
  );
}
