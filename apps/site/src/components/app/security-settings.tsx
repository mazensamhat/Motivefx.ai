"use client";

import { useState } from "react";

async function readError(res: Response): Promise<string> {
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  return data.error ?? "Request failed.";
}

export function SecuritySettings({ totpEnabled: initialTotpEnabled }: { totpEnabled: boolean }) {
  const [totpEnabled, setTotpEnabled] = useState(initialTotpEnabled);
  const [step, setStep] = useState<"menu" | "confirm" | "disable">("menu");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function startSetup() {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      const data = (await res.json()) as { secret?: string; otpauthUrl?: string };
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setSecret(data.secret ?? "");
      setOtpauthUrl(data.otpauthUrl ?? "");
      setStep("confirm");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmSetup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setTotpEnabled(true);
      setStep("menu");
      setCode("");
      setMessage("Two-factor authentication enabled.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function disable2fa(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
      });
      if (!res.ok) {
        setError(await readError(res));
        return;
      }
      setTotpEnabled(false);
      setStep("menu");
      setCode("");
      setPassword("");
      setMessage("Two-factor authentication disabled.");
    } catch {
      setError("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="app-panel space-y-4">
      <h2 className="font-semibold text-white">Security &amp; 2FA</h2>
      <p className="text-sm text-slate-400">
        Two-factor authentication:{" "}
        <strong className={totpEnabled ? "text-[#00e676]" : "text-amber-400"}>
          {totpEnabled ? "Enabled" : "Not enabled"}
        </strong>
      </p>

      {step === "menu" && (
        <div className="space-y-3">
          {!totpEnabled ? (
            <button type="button" className="app-cta-btn" onClick={startSetup} disabled={loading}>
              Enable authenticator app
            </button>
          ) : (
            <button type="button" className="app-cta-btn" onClick={() => setStep("disable")}>
              Disable 2FA
            </button>
          )}
        </div>
      )}

      {step === "confirm" && (
        <form onSubmit={confirmSetup} className="space-y-4 max-w-md">
          <p className="text-sm text-slate-400">
            Add this secret to Google Authenticator, Authy, or 1Password:
          </p>
          <code className="block break-all rounded bg-black/40 px-3 py-2 text-sm text-[#d136f1]">{secret}</code>
          {otpauthUrl && (
            <a className="text-sm text-[#00e676] hover:underline" href={otpauthUrl}>
              Open in authenticator app
            </a>
          )}
          <div>
            <label className="auth-label" htmlFor="totp-code">
              Enter 6-digit code
            </label>
            <input
              id="totp-code"
              className="auth-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="auth-submit max-w-xs" disabled={loading}>
              Confirm 2FA
            </button>
            <button type="button" className="app-cta-btn bg-white/5" onClick={() => setStep("menu")}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {step === "disable" && (
        <form onSubmit={disable2fa} className="space-y-4 max-w-md">
          <div>
            <label className="auth-label" htmlFor="disable-password">
              Current password
            </label>
            <input
              id="disable-password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="auth-label" htmlFor="disable-code">
              Authentication code
            </label>
            <input
              id="disable-code"
              className="auth-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
            />
          </div>
          <div className="flex gap-3">
            <button type="submit" className="auth-submit max-w-xs" disabled={loading}>
              Disable 2FA
            </button>
            <button type="button" className="app-cta-btn bg-white/5" onClick={() => setStep("menu")}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
      {message && <p className="text-sm text-[#00e676]">{message}</p>}
    </section>
  );
}
