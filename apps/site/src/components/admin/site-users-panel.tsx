"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  KeyRound,
  PauseCircle,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  XCircle,
} from "lucide-react";
import type { PricingTierId } from "@/lib/tiers";
import { PRICING_TIERS } from "@/lib/tiers";

type GrantDuration = "1_month" | "2_months" | "3_months" | "lifetime";

interface SiteUser {
  id: string;
  email: string;
  tier: string;
  subscriptionStatus: string;
  accessLabel: string;
  statusLabel: string;
  disabled: boolean;
  hasStripe: boolean;
  hasSubscription: boolean;
  hasStripeSubscription: boolean;
  createdAt: string;
}

export function SiteUsersPanel() {
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState<PricingTierId>("pro");
  const [grantDuration, setGrantDuration] = useState<GrantDuration>("1_month");
  const [grantTier, setGrantTier] = useState<PricingTierId>("pro");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<{
    configured: boolean;
    mode: string;
    webhookUrl: string;
    checklist: { ok: boolean; label: string }[];
  } | null>(null);
  const [emailStatus, setEmailStatus] = useState<{
    configured: boolean;
    from: string;
    resetUrlExample: string;
    checklist: { ok: boolean; label: string }[];
    diagnostic?: string;
    setupSteps?: { step: number; title: string; detail: string; href: string }[];
  } | null>(null);

  const load = useCallback(async (q = query) => {
    setLoading(true);
    setError(null);
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      const [usersRes, stripeRes, emailRes] = await Promise.all([
        fetch(`/api/admin/site-users${params}`, { cache: "no-store" }),
        fetch("/api/admin/stripe-status", { cache: "no-store" }),
        fetch("/api/admin/email-status", { cache: "no-store" }),
      ]);
      if (!usersRes.ok) {
        const body = (await usersRes.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed (${usersRes.status})`);
      }
      const data = (await usersRes.json()) as { users: SiteUser[] };
      setUsers(data.users);
      if (stripeRes.ok) setStripeStatus(await stripeRes.json());
      if (emailRes.ok) setEmailStatus(await emailRes.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load("");
  }, [load]);

  async function patchUser(id: string, body: Record<string, unknown>) {
    setActionLoading(id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/admin/site-users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string; backendSynced?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Update failed");
      if (data.backendSynced === false) {
        setMessage("User saved in site DB, but terminal backend sync failed — check MOTIVEFX_API_URL and BACKEND_SYNC_SECRET on Vercel.");
      } else {
        setMessage("User updated.");
      }
      setEditingId(null);
      setNewPassword("");
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setActionLoading(null);
    }
  }

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/site-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, tier }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not add user");
      }
      setEmail("");
      setPassword("");
      setMessage("User created.");
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add user");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user permanently? This cannot be undone.")) return;
    setActionLoading(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/site-users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not delete user");
      }
      setMessage("User deleted.");
      await load(query);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete user");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <section className="admin-panel app-panel">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-[#00e676]" />
          <div>
            <h2>User management</h2>
            <p className="mt-1 text-sm text-slate-400">
              Grant tiers, set passwords, pause, disable, or cancel accounts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              className="rounded-lg border border-[var(--border)] bg-[rgba(8,10,12,0.8)] py-2 pl-8 pr-3 text-sm text-white"
              placeholder="Search email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load(query)}
            />
          </div>
          <button type="button" className="admin-btn" onClick={() => load(query)} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      <form onSubmit={addUser} className="admin-user-form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>
        <label>
          Starting tier
          <select value={tier} onChange={(e) => setTier(e.target.value as PricingTierId)}>
            {PRICING_TIERS.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          <UserPlus className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Add user"}
        </button>
      </form>

      <div className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Default grant tier
          <select
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[rgba(8,10,12,0.8)] px-2 py-1.5 text-sm text-white"
            value={grantTier}
            onChange={(e) => setGrantTier(e.target.value as PricingTierId)}
          >
            {PRICING_TIERS.filter((t) => t.id !== "lite").map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Duration
          <select
            className="mt-1 block rounded-lg border border-[var(--border)] bg-[rgba(8,10,12,0.8)] px-2 py-1.5 text-sm text-white"
            value={grantDuration}
            onChange={(e) => setGrantDuration(e.target.value as GrantDuration)}
          >
            <option value="1_month">1 month</option>
            <option value="2_months">2 months</option>
            <option value="3_months">3 months</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </label>
        <p className="text-xs text-slate-500">Use Grant on each user row below.</p>
      </div>

      {error && <p className="admin-error-banner">{error}</p>}
      {message && (
        <p className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {message}
        </p>
      )}

      {stripeStatus && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            stripeStatus.configured
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          <p className="font-medium">
            Stripe {stripeStatus.mode} — {stripeStatus.configured ? "ready" : "needs setup"}
          </p>
          <p className="mt-1 text-xs opacity-80">Webhook: {stripeStatus.webhookUrl}</p>
        </div>
      )}

      {emailStatus && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            emailStatus.configured
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100"
          }`}
        >
          <p className="font-medium">Email — {emailStatus.configured ? "ready" : "needs setup"}</p>
          <p className="mt-1 text-xs opacity-80">Password reset links: {emailStatus.resetUrlExample}</p>
          {emailStatus.diagnostic && (
            <p className="mt-2 text-xs font-medium text-amber-100">{emailStatus.diagnostic}</p>
          )}
        </div>
      )}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Tier</th>
              <th>Access until</th>
              <th>Status</th>
              <th>Account</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-slate-400">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-slate-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.tier.replace(/_/g, " ")}</td>
                  <td>{u.accessLabel}</td>
                  <td>{u.statusLabel}</td>
                  <td>{u.disabled ? <span className="text-red-300">Disabled</span> : <span className="text-emerald-300">Active</span>}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      <button
                        type="button"
                        className="admin-btn"
                        disabled={actionLoading === u.id}
                        onClick={() => {
                          setEditingId(editingId === u.id ? null : u.id);
                          setNewPassword("");
                        }}
                      >
                        <KeyRound className="h-3 w-3" /> Password
                      </button>

                      {u.hasStripeSubscription ? (
                        <span className="self-center text-xs text-slate-500">Stripe billing</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="admin-btn admin-btn-primary"
                            disabled={actionLoading === u.id}
                            onClick={() =>
                              patchUser(u.id, {
                                intelligenceTier: grantTier,
                                grantAccessDuration: grantDuration,
                              })
                            }
                          >
                            Grant {grantTier.replace(/_/g, " ")}
                          </button>
                          <button
                            type="button"
                            className="admin-btn"
                            disabled={actionLoading === u.id}
                            onClick={() => patchUser(u.id, { revokeAccess: true })}
                          >
                            Revoke
                          </button>
                        </>
                      )}

                      <button
                        type="button"
                        className="admin-btn"
                        disabled={actionLoading === u.id || u.subscriptionStatus === "paused"}
                        onClick={() => patchUser(u.id, { subscriptionStatus: "paused" })}
                      >
                        <PauseCircle className="h-3 w-3" /> Pause
                      </button>

                      {u.disabled ? (
                        <button
                          type="button"
                          className="admin-btn"
                          disabled={actionLoading === u.id}
                          onClick={() => patchUser(u.id, { disabled: false, subscriptionStatus: "active" })}
                        >
                          <UserCheck className="h-3 w-3" /> Enable
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          disabled={actionLoading === u.id}
                          onClick={() => patchUser(u.id, { disabled: true })}
                        >
                          <Ban className="h-3 w-3" /> Disable
                        </button>
                      )}

                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        disabled={actionLoading === u.id}
                        onClick={() => {
                          if (confirm(`Cancel access for ${u.email}?`)) {
                            void patchUser(u.id, { cancelAccount: true });
                          }
                        }}
                      >
                        <XCircle className="h-3 w-3" /> Cancel
                      </button>

                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        disabled={actionLoading === u.id}
                        onClick={() => removeUser(u.id)}
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>

                    {editingId === u.id && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <input
                          type="password"
                          className="rounded-lg border border-[var(--border)] bg-[rgba(8,10,12,0.8)] px-3 py-2 text-sm text-white"
                          placeholder="New password (8+ chars)"
                          value={newPassword}
                          minLength={8}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="admin-btn admin-btn-primary"
                          disabled={newPassword.length < 8 || actionLoading === u.id}
                          onClick={() => patchUser(u.id, { password: newPassword })}
                        >
                          Set password
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
