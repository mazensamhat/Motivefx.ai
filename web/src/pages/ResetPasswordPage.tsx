import { useState } from "react";
import { LegalPageLayout } from "../components/LegalPageLayout";
import { authPublicPost } from "../lib/api";

export function ResetPasswordPage({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authPublicPost("/reset-password", { token, password });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LegalPageLayout title="Reset password">
      {done ? (
        <p>
          Password updated. <a href="/">Sign in</a>
        </p>
      ) : (
        <form className="auth-form" onSubmit={submit}>
          <label>
            New password (min 8 characters)
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
          </label>
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn btn-annual-cta" disabled={loading || !token}>
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      )}
    </LegalPageLayout>
  );
}
