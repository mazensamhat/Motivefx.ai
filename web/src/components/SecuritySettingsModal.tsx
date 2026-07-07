import { useState } from "react";
import { Shield, X } from "lucide-react";
import { authPost, type AuthUser } from "../lib/api";
import { SITE_EMBED } from "../lib/siteSession";
import { siteAuthPost } from "../lib/siteSecurity";

interface Props {
  user: AuthUser;
  onClose: () => void;
  onUserUpdated: () => Promise<void>;
}

async function securityPost<T>(path: string, body: unknown = {}): Promise<T> {
  if (SITE_EMBED) return siteAuthPost<T>(path, body);
  return authPost<T>(path, body);
}

export function SecuritySettingsModal({ user, onClose, onUserUpdated }: Props) {
  const [step, setStep] = useState<"menu" | "setup" | "confirm" | "disable">("menu");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function startSetup() {
    setError(null);
    setLoading(true);
    try {
      const res = await securityPost<{ secret: string; otpauthUrl: string }>("/2fa/setup");
      setSecret(res.secret);
      setOtpauthUrl(res.otpauthUrl);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await securityPost("/2fa/confirm", { code });
      await onUserUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setLoading(false);
    }
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await securityPost("/2fa/disable", { code, password });
      await onUserUpdated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable 2FA");
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

        <div className="security-header">
          <Shield size={20} />
          <h2>Security</h2>
        </div>
        <p className="auth-sub">Signed in as {user.email}</p>

        {step === "menu" && (
          <div className="security-menu">
            <p>
              Two-factor authentication:{" "}
              <strong className={user.totpEnabled ? "security-on" : "security-off"}>
                {user.totpEnabled ? "Enabled" : "Not enabled"}
              </strong>
            </p>
            {!user.totpEnabled ? (
              <button type="button" className="btn btn-annual-cta" onClick={startSetup} disabled={loading}>
                Enable authenticator app
              </button>
            ) : (
              <button type="button" className="btn admin-btn" onClick={() => setStep("disable")}>
                Disable 2FA
              </button>
            )}
            {error && <p className="auth-error">{error}</p>}
          </div>
        )}

        {step === "confirm" && (
          <form className="auth-form" onSubmit={confirmSetup}>
            <p className="auth-sub">
              Add this secret to Google Authenticator, Authy, or 1Password:
            </p>
            <code className="totp-secret">{secret}</code>
            {otpauthUrl && (
              <a className="totp-link" href={otpauthUrl}>
                Open in authenticator app
              </a>
            )}
            <label>
              Enter 6-digit code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn btn-annual-cta" disabled={loading}>
              Confirm 2FA
            </button>
          </form>
        )}

        {step === "disable" && (
          <form className="auth-form" onSubmit={disable2fa}>
            <label>
              Current password
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </label>
            <label>
              Authentication code
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
              />
            </label>
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" className="btn admin-btn" disabled={loading}>
              Disable 2FA
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
