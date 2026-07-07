"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Trash2, UserPlus } from "lucide-react";

interface SiteUser {
  id: string;
  email: string;
  tier: string;
  hasSubscription: boolean;
  hasStripe: boolean;
  createdAt: string;
}

export function SiteUsersPanel() {
  const [users, setUsers] = useState<SiteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tier, setTier] = useState("lite");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/site-users", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `Failed (${res.status})`);
      }
      const data = (await res.json()) as { users: SiteUser[] };
      setUsers(data.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add user");
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(id: string) {
    if (!confirm("Delete this user from MotiveFX? This cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/site-users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Could not delete user");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete user");
    }
  }

  return (
    <section className="admin-panel app-panel">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Site accounts (Supabase)</h2>
          <p className="mt-1 text-sm text-slate-400">Login users for motivefxai.com — add or remove access.</p>
        </div>
        <button type="button" className="admin-btn" onClick={load} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
      </div>

      <form onSubmit={addUser} className="admin-user-form">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
        </label>
        <label>
          Tier
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="lite">Lite</option>
            <option value="pro">Pro</option>
            <option value="ultra">Ultra</option>
            <option value="ultra_plus">Ultra+</option>
            <option value="elite">Elite</option>
          </select>
        </label>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
          <UserPlus className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Add user"}
        </button>
      </form>

      {error && <p className="admin-error-banner">{error}</p>}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Tier</th>
              <th>Stripe</th>
              <th>Joined</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-slate-400">
                  Loading users…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-slate-400">
                  No users yet.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td className="capitalize">{u.tier.replace(/_/g, " ")}</td>
                  <td>{u.hasSubscription ? "Subscribed" : u.hasStripe ? "Customer" : "—"}</td>
                  <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => removeUser(u.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
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
