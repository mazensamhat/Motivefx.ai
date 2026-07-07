"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/brand/logo";

async function readApiError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Something went wrong.";
  } catch {
    return res.status === 401 ? "Invalid email or password." : "Something went wrong.";
  }
}

function AuthFormInner({ mode }: { mode: "login" | "register" }) {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/app";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body =
      mode === "login"
        ? { email, password }
        : { email, password, acceptTerms, acceptPrivacy };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        setError(await readApiError(res));
        return;
      }

      const payload = (await res.json()) as { redirectTo?: string };
      window.location.href = payload.redirectTo ?? next;
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card w-full max-w-md">
      <h1 className="text-2xl font-bold text-white">
        {mode === "login" ? "Welcome back" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {mode === "login"
          ? "Sign in to open your intelligence terminal."
          : "Start with market intelligence built around you."}
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
        <div>
          <label className="auth-label" htmlFor="password">
            Password
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
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </div>

        {mode === "register" && (
          <div className="space-y-3 text-sm text-slate-400">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                required
              />
              <span>
                I agree to the{" "}
                <Link href="/faq/is-motivefx-ai-financial-advice" className="text-[#00e676] hover:underline">
                  Terms of Service
                </Link>
              </span>
            </label>
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                required
              />
              <span>
                I agree to the{" "}
                <Link href="/faq/what-is-your-data-source" className="text-[#00e676] hover:underline">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button type="submit" className="auth-submit" disabled={loading}>
          {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  return (
    <Suspense fallback={<div className="auth-card h-64 animate-pulse" />}>
      <AuthFormInner mode={mode} />
    </Suspense>
  );
}

export function AuthPageShell({
  mode,
  footer,
}: {
  mode: "login" | "register";
  footer: ReactNode;
}) {
  return (
    <div className="auth-page flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="mb-8">
        <BrandLogo />
      </div>
      <AuthForm mode={mode} />
      <div className="mt-6 text-center text-sm text-slate-400">{footer}</div>
    </div>
  );
}
