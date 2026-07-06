import { useState } from "react";

const KEY = "motivefx_age_verified";

export function isAgeVerified(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

interface Props {
  moduleLabel: string;
  onVerified: () => void;
}

export function AgeGateModal({ moduleLabel, onVerified }: Props) {
  const [declined, setDeclined] = useState(false);

  function accept() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ok */
    }
    onVerified();
  }

  if (declined) {
    return (
      <div className="age-gate-overlay">
        <div className="age-gate-modal glass-panel">
          <h2>Access restricted</h2>
          <p>You must be 18+ (19+ in some Canadian provinces) to use {moduleLabel}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="age-gate-overlay">
      <div className="age-gate-modal glass-panel">
        <h2>Age verification</h2>
        <p>
          {moduleLabel} involves gambling-adjacent or event-market content. Confirm you are at least{" "}
          <strong>18 years old</strong> and that this content is legal in your jurisdiction.
        </p>
        <div className="age-gate-actions">
          <button type="button" className="btn btn-annual-cta" onClick={accept}>
            I am 18 or older
          </button>
          <button type="button" className="btn admin-btn" onClick={() => setDeclined(true)}>
            I am under 18
          </button>
        </div>
      </div>
    </div>
  );
}
