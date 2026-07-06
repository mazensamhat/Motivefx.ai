import { useState } from "react";
import { LegalPageLayout } from "../components/LegalPageLayout";
import { authPublicPost } from "../lib/api";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await authPublicPost<{ message: string; resetUrl?: string }>("/forgot-password", { email });
      setMessage(res.message);
      setResetUrl(res.resetUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LegalPageLayout title="Forgot password">
      <form className="auth-form" onSubmit={submit}>
        <p>Enter your account email. We will send a reset link if it exists.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        {message && <p className="auth-sub">{message}</p>}
        {resetUrl && (
          <p className="auth-sub">
            Dev/staging reset link: <a href={resetUrl}>{resetUrl}</a>
          </p>
        )}
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn btn-annual-cta" disabled={loading}>
          {loading ? "Sending…" : "Send reset link"}
        </button>
      </form>
    </LegalPageLayout>
  );
}
