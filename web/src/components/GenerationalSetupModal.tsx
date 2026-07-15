import { useState } from "react";
import { Calculator, ChevronLeft, Shield, Sparkles, Users, X, Zap } from "lucide-react";
import {
  ACQUISITION_CHANNELS,
  GENDER_OPTIONS,
  SEX_OPTIONS,
  getAcquisitionChannel,
} from "../lib/acquisition";
import {
  COHORT_ORDER,
  GENERATIONAL_PROFILES,
  type CohortId,
} from "../config/generationalProfiles";

const COHORT_ICONS: Record<CohortId, typeof Zap> = {
  genz: Zap,
  millennial: Sparkles,
  genx: Calculator,
  boomer: Shield,
};

export interface ProfileSetupData {
  cohort: CohortId;
  sex: string;
  gender: string;
  acquisitionChannel: string;
}

interface Props {
  cohort: CohortId;
  onComplete: (data: ProfileSetupData) => void;
  onDismiss: () => void;
}

/** Sex/gender are optional demographics (App Store 5.1.1(v)). Never block signup. */
export function GenerationalSetupModal({ cohort, onComplete, onDismiss }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<CohortId>(cohort);
  const [sex, setSex] = useState("prefer_not_to_say");
  const [gender, setGender] = useState("prefer_not_to_say");
  const [channel, setChannel] = useState(() => getAcquisitionChannel() ?? "");

  const preview = GENERATIONAL_PROFILES[selected];

  function finish(opts?: { skipDemographics?: boolean }) {
    onComplete({
      cohort: selected,
      sex: opts?.skipDemographics ? "prefer_not_to_say" : sex || "prefer_not_to_say",
      gender: opts?.skipDemographics ? "prefer_not_to_say" : gender || "prefer_not_to_say",
      acquisitionChannel: opts?.skipDemographics ? channel || "other" : channel || "other",
    });
  }

  return (
    <div className="gen-setup-overlay" onClick={onDismiss}>
      <div className="gen-setup-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="gen-setup-close" onClick={onDismiss} aria-label="Dismiss">
          <X size={20} />
        </button>

        <header className="gen-setup-header">
          <Users size={22} className="gen-setup-header-icon" />
          <div>
            <h2 className="gen-setup-title">
              {step === 1 ? "Personalize Your Terminal" : "Optional demographics"}
            </h2>
            <p className="gen-setup-sub">
              {step === 1
                ? "Select your experience profile — copy and pricing hooks adapt to your cohort."
                : "Sex and gender are optional. You can skip or choose Prefer not to say."}
            </p>
          </div>
        </header>

        {step === 1 ? (
          <>
            <div className="gen-setup-list">
              {COHORT_ORDER.map((id) => {
                const p = GENERATIONAL_PROFILES[id];
                const Icon = COHORT_ICONS[id];
                const active = selected === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className={`gen-setup-cohort ${active ? "active" : ""}`}
                    style={
                      active
                        ? { borderColor: p.accent, boxShadow: `0 0 24px ${p.glow}` }
                        : undefined
                    }
                    onClick={() => setSelected(id)}
                  >
                    <span
                      className="gen-setup-cohort-icon"
                      style={{ color: p.accent, backgroundColor: `${p.accent}15`, borderColor: `${p.accent}30` }}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="gen-setup-cohort-copy">
                      <strong>
                        {p.name} <span className="gen-setup-age">(Ages {p.ageRange})</span>
                      </strong>
                      <span>{p.strategyFocus}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="gen-setup-preview">
              <span className="gen-setup-preview-label">Preview tagline</span>
              <p className="gen-setup-preview-tagline" style={{ color: preview.accent }}>
                {preview.tagline}
              </p>
            </div>

            <button
              type="button"
              className="btn btn-annual-cta gen-setup-confirm"
              style={{ backgroundColor: preview.accent, color: selected === "boomer" ? "#fff" : "#000" }}
              onClick={() => finish({ skipDemographics: true })}
            >
              Apply {preview.name} Experience
            </button>
            <button
              type="button"
              className="btn admin-btn gen-setup-optional-link"
              onClick={() => setStep(2)}
            >
              Add optional demographics
            </button>
          </>
        ) : (
          <>
            <button type="button" className="gen-setup-back" onClick={() => setStep(1)}>
              <ChevronLeft size={14} /> Back
            </button>

            <div className="gen-demo-fields">
              <label className="gen-demo-field">
                <span>
                  Sex <em className="gen-optional-tag">(optional)</em>
                </span>
                <select value={sex} onChange={(e) => setSex(e.target.value)}>
                  {SEX_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="gen-demo-field">
                <span>
                  Gender identity <em className="gen-optional-tag">(optional)</em>
                </span>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  {GENDER_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="gen-demo-field">
                <span>
                  How did you find MotiveFX? <em className="gen-optional-tag">(optional)</em>
                </span>
                <select value={channel} onChange={(e) => setChannel(e.target.value)}>
                  <option value="">Prefer not to say</option>
                  {ACQUISITION_CHANNELS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              className="btn btn-annual-cta gen-setup-confirm"
              style={{ backgroundColor: preview.accent, color: selected === "boomer" ? "#fff" : "#000" }}
              onClick={() => finish()}
            >
              Save and continue
            </button>
            <button
              type="button"
              className="btn admin-btn gen-setup-optional-link"
              onClick={() => finish({ skipDemographics: true })}
            >
              Skip — prefer not to say
            </button>
          </>
        )}
      </div>
    </div>
  );
}
