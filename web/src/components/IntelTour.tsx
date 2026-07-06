import { Bell, Radar, Shield, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

const TOUR_KEY = "motivefx_intel_tour_seen";

interface Props {
  onComplete?: () => void;
}

export function IntelTour({ onComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) {
      setOpen(true);
    }
  }, []);

  function finish() {
    localStorage.setItem(TOUR_KEY, "1");
    setOpen(false);
    onComplete?.();
  }

  if (!open) return null;

  const steps = [
    {
      icon: Radar,
      title: "We surface signals — you decide",
      body: "MotiveFX is an intelligence command center. We flag flow, volume, lines, and events. What you do with that intel is always your call.",
    },
    {
      icon: Sparkles,
      title: "Click anything for intel",
      body: "Signal chips, signal strength scores, feed rows, and module pulse cards open detail panels. Use Why? for the full AI breakdown, then Save to journal or Share.",
    },
    {
      icon: Bell,
      title: "Radar alerts & journal",
      body: "Star symbols on your radar — matching signals appear in the bell menu and Home alerts section. Log notes in your private Paper Intel Journal.",
    },
    {
      icon: Shield,
      title: "Your responsibility",
      body: "Motive provides educational intel only — not financial, investment, tax, or gambling advice. When you create an account, you confirm you make your own financial and wagering decisions. Export or delete your data anytime in Account settings. Privacy, Terms, and the full legal pack are in the footer.",
    },
  ];

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="intel-tour-overlay" role="dialog" aria-modal="true">
      <div className="intel-tour-modal glass-panel">
        <button type="button" className="intel-tour-close btn-icon" onClick={finish} aria-label="Close tour">
          <X size={18} />
        </button>
        <div className="intel-tour-icon">
          <Icon size={28} />
        </div>
        <h2>{current.title}</h2>
        <p>{current.body}</p>
        <div className="intel-tour-dots">
          {steps.map((_, i) => (
            <span key={i} className={i === step ? "active" : ""} />
          ))}
        </div>
        <div className="intel-tour-actions">
          {step > 0 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep((s) => s - 1)}>
              Back
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
          >
            {isLast ? "Enter command center" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
