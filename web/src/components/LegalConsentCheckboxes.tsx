interface Props {
  acceptPrivacy: boolean;
  acceptTerms: boolean;
  acceptRisk: boolean;
  marketingConsent: boolean;
  onPrivacyChange: (v: boolean) => void;
  onTermsChange: (v: boolean) => void;
  onRiskChange: (v: boolean) => void;
  onMarketingChange: (v: boolean) => void;
}

export function LegalConsentCheckboxes({
  acceptPrivacy,
  acceptTerms,
  acceptRisk,
  marketingConsent,
  onPrivacyChange,
  onTermsChange,
  onRiskChange,
  onMarketingChange,
}: Props) {
  return (
    <div className="legal-consent-group">
      <p className="legal-consent-intro">Review and accept to create your account:</p>
      <label className="legal-consent-row">
        <input type="checkbox" checked={acceptPrivacy} onChange={(e) => onPrivacyChange(e.target.checked)} required />
        <span>
          I agree to the{" "}
          <a href="/legal-documents.html" target="_blank" rel="noreferrer">
            Legal documents
          </a>{" "}
          including the{" "}
          <a href="/legal-documents.html#privacy" target="_blank" rel="noreferrer">Privacy Policy</a>{" "}
          (required)
        </span>
      </label>
      <label className="legal-consent-row">
        <input type="checkbox" checked={acceptTerms} onChange={(e) => onTermsChange(e.target.checked)} required />
        <span>
          I agree to the{" "}
          <a href="/legal-documents.html#terms" target="_blank" rel="noreferrer">Terms of Service</a>{" "}
          and{" "}
          <a href="/legal-documents.html#data-deletion" target="_blank" rel="noreferrer">
            Data Deletion policy
          </a>{" "}
          (required)
        </span>
      </label>
      <label className="legal-consent-row legal-consent-risk">
        <input type="checkbox" checked={acceptRisk} onChange={(e) => onRiskChange(e.target.checked)} required />
        <span>
          I understand MotiveFX.AI provides <strong>educational and informational content only</strong>.
          I am solely responsible for my own financial, investment, and wagering decisions (required)
        </span>
      </label>
      <label className="legal-consent-row">
        <input type="checkbox" checked={marketingConsent} onChange={(e) => onMarketingChange(e.target.checked)} />
        <span>Send me product updates and offers (optional)</span>
      </label>
    </div>
  );
}
