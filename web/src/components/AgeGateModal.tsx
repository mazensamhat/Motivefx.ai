import { useMemo, useState, type ReactNode } from "react";

const KEY = "motivefx_age_verified";
const MIN_AGE = 18;

export function isAgeVerified(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function setAgeVerified(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    /* ok */
  }
}

function ageFromBirthYear(year: number): number {
  return new Date().getFullYear() - year;
}

interface Props {
  moduleLabel: string;
  onVerified: () => void;
}

/**
 * Birth-year age assurance (18+). Used for app-wide first launch and module gates.
 */
export function AgeGateModal({ moduleLabel, onVerified }: Props) {
  const currentYear = new Date().getFullYear();
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYear; y >= currentYear - 100; y -= 1) years.push(y);
    return years;
  }, [currentYear]);

  const [birthYear, setBirthYear] = useState("");
  const [declined, setDeclined] = useState(false);
  const [tooYoung, setTooYoung] = useState(false);

  const yearNum = birthYear ? Number.parseInt(birthYear, 10) : NaN;
  const age = Number.isFinite(yearNum) ? ageFromBirthYear(yearNum) : null;
  const canContinue = age !== null && age >= MIN_AGE && yearNum <= currentYear && yearNum >= currentYear - 100;

  function accept() {
    if (!canContinue) {
      if (age !== null && age < MIN_AGE) setTooYoung(true);
      return;
    }
    setAgeVerified();
    onVerified();
  }

  if (declined || tooYoung) {
    return (
      <div className="age-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
        <div className="age-gate-modal glass-panel">
          <h2 id="age-gate-title">Access restricted</h2>
          <p>
            You must be {MIN_AGE}+ (19+ in some Canadian provinces) to use {moduleLabel}. MotiveFX.AI
            includes sports-betting and event-market intelligence modules.
          </p>
          {!declined && (
            <div className="age-gate-actions">
              <button type="button" className="btn admin-btn" onClick={() => setTooYoung(false)}>
                Enter a different birth year
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="age-gate-overlay" role="dialog" aria-modal="true" aria-labelledby="age-gate-title">
      <div className="age-gate-modal glass-panel">
        <h2 id="age-gate-title">Age verification</h2>
        <p>
          {moduleLabel} involves gambling-adjacent or event-market content. Enter your{" "}
          <strong>birth year</strong> to confirm you are at least <strong>{MIN_AGE} years old</strong>{" "}
          and that this content is legal in your jurisdiction.
        </p>
        <label className="age-gate-year-field">
          <span>Birth year</span>
          <select
            value={birthYear}
            onChange={(e) => {
              setBirthYear(e.target.value);
              setTooYoung(false);
            }}
            aria-label="Birth year"
          >
            <option value="">Select year</option>
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>
        </label>
        {age !== null && age < MIN_AGE && birthYear && (
          <p className="age-gate-hint">You must be {MIN_AGE} or older to continue.</p>
        )}
        <div className="age-gate-actions">
          <button
            type="button"
            className="btn btn-annual-cta"
            onClick={accept}
            disabled={!canContinue}
          >
            Continue
          </button>
          <button type="button" className="btn admin-btn" onClick={() => setDeclined(true)}>
            I am under {MIN_AGE}
          </button>
        </div>
      </div>
    </div>
  );
}

/** First-launch app-wide gate so WebView / terminal reviewers see it immediately. */
export function AppAgeGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(() => isAgeVerified());
  if (!ok) {
    return (
      <AgeGateModal moduleLabel="MotiveFX.AI" onVerified={() => setOk(true)} />
    );
  }
  return <>{children}</>;
}
