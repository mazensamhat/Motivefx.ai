"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Something went wrong.";
  } catch {
    return "Something went wrong.";
  }
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }

      const payload = (await res.json()) as { message?: string };
      setMessage(payload.message ?? "Check your email for a reset link.");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card w-full max-w-md">
      <h1 className="text-2xl font-bold text-white">Reset your password</h1>
      <p className="mt-2 text-sm text-slate-400">
        Enter your email and we&apos;ll send you a link to choose a new password.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="auth-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="auth-input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        {message && <p className="text-sm text-[#00e676]">{message}</p>}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Please wait…" : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-400">
        <Link href="/login" className="font-medium text-[#00e676] hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

function ResetPasswordFormInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid. Request a new one.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }

      const payload = (await res.json()) as { redirectTo?: string };
      router.push(payload.redirectTo ?? "/app");
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-card w-full max-w-md">
        <h1 className="text-2xl font-bold text-white">Invalid reset link</h1>
        <p className="mt-2 text-sm text-slate-400">
          This link is missing or expired. Request a new password reset email.
        </p>
        <p className="mt-6 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-[#00e676] hover:underline">
            Request reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="auth-card w-full max-w-md">
      <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
      <p className="mt-2 text-sm text-slate-400">Must be at least 8 characters.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label className="auth-label" htmlFor="password">
            New password
          </label>
          <input
            id="password"
            type="password"
            className="auth-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="auth-label" htmlFor="confirmPassword">
            Confirm password
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="auth-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Please wait…" : "Update password"}
        </button>
      </form>
    </div>
  );
}

export function ResetPasswordForm() {
  return (
    <Suspense fallback={<div className="auth-card h-64 animate-pulse" />}>
      <ResetPasswordFormInner />
    </Suspense>
  );
}
