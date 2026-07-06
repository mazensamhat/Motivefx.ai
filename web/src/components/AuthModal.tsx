import { useState } from "react";
import { X } from "lucide-react";
import { authPublicPost, type AuthUser } from "../lib/api";
import { LegalConsentCheckboxes } from "./LegalConsentCheckboxes";
import { MotiveFxBrandLogo } from "./MotivFxLogo";

interface SessionResult {
  requires2fa?: boolean;
  pendingToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
}

interface Props {
  mode: "login" | "register";
  onClose: () => void;
  onSwitchMode: (mode: "login" | "register") => void;
  onAuthed: (session: { accessToken: string; refreshToken: string; user: AuthUser }) => void;
  anonymousUserId: string;
  acquisitionChannel: string | null;
}

export function AuthModal({
  mode,
  onClose,
  onSwitchMode,
  onAuthed,
  anonymousUserId,
  acquisitionChannel,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptRisk, setAcceptRisk] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (pendingToken) {
        const session = await authPublicPost<SessionResult>("/login/2fa", {
          pending_token: pendingToken,
          code: totpCode,
        });
        if (session.accessToken && session.refreshToken && session.user) {
          onAuthed({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            user: session.user,
          });
        }
        return;
      }

      if (mode === "register") {
        if (!acceptPrivacy || !acceptTerms || !acceptRisk) {
          setError("You must accept the legal documents and risk acknowledgement.");
          return;
        }
        const session = await authPublicPost<SessionResult>("/register", {
          email,
          password,
          display_name: displayName || undefined,
          accept_privacy: acceptPrivacy,
          accept_terms: acceptTerms,
          accept_risk_ack: acceptRisk,
          marketing_consent: marketingConsent,
          anonymous_user_id: anonymousUserId,
          acquisition_channel: acquisitionChannel,
        });
        if (session.accessToken && session.refreshToken && session.user) {
          onAuthed({
            accessToken: session.accessToken,
            refreshToken: session.refreshToken,
            user: session.user,
          });
        }
        return;
      }

      const session = await authPublicPost<SessionResult>("/login", { email, password });
      if (session.requires2fa && session.pendingToken) {
        setPendingToken(session.pendingToken);
        return;
      }
      if (session.accessToken && session.refreshToken && session.user) {
        onAuthed({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal glass-panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        <MotiveFxBrandLogo className="motivfx-brand-image-auth" />

        <h2>{pendingToken ? "Two-factor authentication" : mode === "login" ? "Sign in" : "Create account"}</h2>
        <p className="auth-sub">
          {pendingToken
            ? "Enter the 6-digit code from your authenticator app."
            : mode === "login"
              ? "Secure your holdings, subscriptions, and preferences."
              : "Sync holdings, alerts, and journal across your devices."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {!pendingToken && (
            <>
              {mode === "register" && (
                <label>
                  Display name
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Optional"
                    autoComplete="name"
                  />
                </label>
              )}
              <label>
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </label>
              {mode === "register" && (
                <LegalConsentCheckboxes
                  acceptPrivacy={acceptPrivacy}
                  acceptTerms={acceptTerms}
                  acceptRisk={acceptRisk}
                  marketingConsent={marketingConsent}
                  onPrivacyChange={setAcceptPrivacy}
                  onTermsChange={setAcceptTerms}
                  onRiskChange={setAcceptRisk}
                  onMarketingChange={setMarketingConsent}
                />
              )}
            </>
          )}

          {pendingToken && (
            <label>
              Authentication code
              <input
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                pattern="[0-9]{6}"
                required
                autoFocus
              />
            </label>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn btn-annual-cta auth-submit" disabled={loading}>
            {loading ? "Please wait…" : pendingToken ? "Verify" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {!pendingToken && mode === "login" && (
          <p className="auth-forgot">
            <a href="/?page=forgot-password">Forgot password?</a>
          </p>
        )}

        {!pendingToken && (
          <p className="auth-switch">
            {mode === "login" ? "No account?" : "Already have an account?"}{" "}
            <button type="button" onClick={() => onSwitchMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
