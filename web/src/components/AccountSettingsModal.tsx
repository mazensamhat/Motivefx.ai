import { useState } from "react";
import { Download, Trash2, X } from "lucide-react";
import { authGet, authPost, clearSession, apiPost, getUserId } from "../lib/api";
import { SITE_EMBED } from "../lib/siteSession";
import { openSiteBillingPortal } from "../lib/siteSecurity";
import { SecuritySettingsModal } from "./SecuritySettingsModal";
import type { AuthUser } from "../lib/api";

interface Props {
  user: AuthUser;
  onClose: () => void;
  onLogout: () => Promise<void>;
  onUserUpdated: () => Promise<void>;
}

export function AccountSettingsModal({ user, onClose, onLogout, onUserUpdated }: Props) {
  const [tab, setTab] = useState<"account" | "security">("account");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function exportData() {
    setLoading(true);
    setError(null);
    try {
      const data = await authGet<Record<string, unknown>>("/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motivefx-export-${getUserId()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Download started.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  async function openBillingPortal() {
    setLoading(true);
    setError(null);
    try {
      if (SITE_EMBED) {
        await openSiteBillingPortal();
        return;
      }
      const res = await apiPost<{ url?: string }>("/advisor/billing/portal", {
        user_id: getUserId(),
        return_url: window.location.href,
      });
      if (res.url) window.location.href = res.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing portal unavailable");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authPost("/delete-account", { password, confirmation: confirm });
      clearSession();
      await onLogout();
      window.location.href = "/";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setLoading(false);
    }
  }

  if (tab === "security") {
    return (
      <SecuritySettingsModal
        user={user}
        onClose={() => setTab("account")}
        onUserUpdated={onUserUpdated}
      />
    );
  }

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal glass-panel account-settings-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
        <h2>Account</h2>
        <p className="auth-sub">{user.email}</p>

        <div className="account-settings-actions">
          <button type="button" className="btn admin-btn" onClick={() => setTab("security")}>
            Security &amp; 2FA
          </button>
          <button type="button" className="btn admin-btn" onClick={exportData} disabled={loading}>
            <Download size={14} /> Export my data
          </button>
          <button type="button" className="btn admin-btn" onClick={openBillingPortal} disabled={loading}>
            Manage billing
          </button>
          <a className="btn admin-btn" href="/?page=forgot-password">
            Change password
          </a>
        </div>

        <form className="account-delete-form auth-form" onSubmit={deleteAccount}>
          <h3>Delete account</h3>
          <p className="auth-sub">
            This permanently removes your data. See our{" "}
            <a href="/?page=data-deletion" target="_blank" rel="noreferrer">Data Deletion policy</a>.
            Type DELETE to confirm.
          </p>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            Confirmation
            <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="DELETE" required />
          </label>
          {message && <p className="auth-sub">{message}</p>}
          {error && <p className="auth-error">{error}</p>}
          <button type="submit" className="btn admin-btn account-delete-btn" disabled={loading}>
            <Trash2 size={14} /> Delete account
          </button>
        </form>
      </div>
    </div>
  );
}
