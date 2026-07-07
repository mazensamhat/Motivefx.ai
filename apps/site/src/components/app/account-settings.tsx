"use client";

import { useState } from "react";
import Link from "next/link";
import { PRICING_TIERS, type PricingTierId } from "@/lib/tiers";

function tierLabel(tier: string) {
  return PRICING_TIERS.find((t) => t.id === tier)?.name ?? tier;
}

export function AccountSettings({
  email,
  tier,
  markets,
  hasSubscription,
  hasBillingAccount,
}: {
  email: string;
  tier: string;
  markets: string[];
  hasSubscription: boolean;
  hasBillingAccount: boolean;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordErr, setPasswordErr] = useState("");
  const [billingErr, setBillingErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackKind, setFeedbackKind] = useState<"bug" | "feature" | "billing" | "other">("feature");
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordErr("");
    setPasswordMsg("");
    if (newPassword !== confirmPassword) {
      setPasswordErr("New passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) {
        setPasswordErr(data.error ?? "Could not update password.");
        return;
      }
      setPasswordMsg(data.message ?? "Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordErr("Could not reach the server.");
    } finally {
      setLoading(false);
    }
  }

  async function openBilling() {
    setBillingErr("");
    try {
      const res = await fetch("/api/billing/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setBillingErr(data.error ?? "Could not open billing portal.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setBillingErr("Could not reach billing.");
    }
  }

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    setFeedbackStatus("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: feedbackKind,
          message: feedbackMsg,
          pagePath: "/app/settings",
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setFeedbackStatus(data.error ?? "Could not send feedback.");
        return;
      }
      setFeedbackStatus("Thanks — we received your feedback.");
      setFeedbackMsg("");
    } catch {
      setFeedbackStatus("Could not reach the server.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Account settings</h1>
        <p className="mt-1 text-sm text-slate-400">Manage your plan, billing, and password.</p>
      </div>

      <section className="app-panel space-y-4">
        <h2 className="font-semibold text-white">Profile</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="mt-1 font-medium text-white">{email}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Plan</dt>
            <dd className="mt-1 font-medium text-white">{tierLabel(tier as PricingTierId)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Markets</dt>
            <dd className="mt-1 text-white">
              {markets.length > 0 ? markets.map((m) => m.replace(/_/g, " ")).join(", ") : "None selected"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Subscription</dt>
            <dd className="mt-1 font-medium text-white">{hasSubscription ? "Active" : "Not subscribed"}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-3 pt-2">
          {hasBillingAccount ? (
            <button type="button" className="app-cta-btn" onClick={openBilling}>
              Manage billing
            </button>
          ) : (
            <Link href="/pricing" className="app-cta-btn">
              Subscribe
            </Link>
          )}
        </div>
        {billingErr && <p className="text-sm text-red-400">{billingErr}</p>}
      </section>

      <section className="app-panel">
        <h2 className="font-semibold text-white">Change password</h2>
        <p className="mt-1 text-sm text-slate-400">Minimum 8 characters.</p>
        <form onSubmit={changePassword} className="mt-4 space-y-4 max-w-md">
          <div>
            <label className="auth-label" htmlFor="current">Current password</label>
            <input
              id="current"
              type="password"
              className="auth-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div>
            <label className="auth-label" htmlFor="new">New password</label>
            <input
              id="new"
              type="password"
              className="auth-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
          <div>
            <label className="auth-label" htmlFor="confirm">Confirm new password</label>
            <input
              id="confirm"
              type="password"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
              autoComplete="new-password"
            />
          </div>
          {passwordErr && <p className="text-sm text-red-400">{passwordErr}</p>}
          {passwordMsg && <p className="text-sm text-[#00e676]">{passwordMsg}</p>}
          <button type="submit" className="auth-submit max-w-xs" disabled={loading}>
            {loading ? "Saving…" : "Update password"}
          </button>
        </form>
      </section>

      <section className="app-panel">
        <h2 className="font-semibold text-white">Send feedback</h2>
        <p className="mt-1 text-sm text-slate-400">Report bugs or request features (saved to ops inbox).</p>
        <form onSubmit={submitFeedback} className="mt-4 space-y-4 max-w-md">
          <div>
            <label className="auth-label" htmlFor="feedback-kind">Type</label>
            <select
              id="feedback-kind"
              className="auth-input"
              value={feedbackKind}
              onChange={(e) => setFeedbackKind(e.target.value as typeof feedbackKind)}
            >
              <option value="feature">Feature request</option>
              <option value="bug">Bug</option>
              <option value="billing">Billing</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="auth-label" htmlFor="feedback-msg">Message</label>
            <textarea
              id="feedback-msg"
              className="auth-input min-h-[100px]"
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              minLength={8}
              required
            />
          </div>
          {feedbackStatus && (
            <p className={`text-sm ${feedbackStatus.startsWith("Thanks") ? "text-[#00e676]" : "text-red-400"}`}>
              {feedbackStatus}
            </p>
          )}
          <button type="submit" className="auth-submit max-w-xs">
            Send feedback
          </button>
        </form>
      </section>
    </div>
  );
}
