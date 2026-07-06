import { LogIn, LogOut, Shield, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

export function AccountMenu() {
  const { user, isAuthenticated, openAuth, openAccount, logout, loading } = useAuth();

  if (loading) {
    return <span className="account-menu-loading">…</span>;
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="account-menu">
        <button type="button" className="btn admin-btn account-btn" onClick={() => openAuth("login")}>
          <LogIn size={14} /> Sign in
        </button>
        <button type="button" className="btn btn-annual-cta account-btn" onClick={() => openAuth("register")}>
          Create account
        </button>
      </div>
    );
  }

  return (
    <div className="account-menu account-menu-authed">
      <span className="account-email" title={user.email}>
        <User size={14} />
        {user.displayName || user.email}
      </span>
      <button type="button" className="btn admin-btn account-btn" onClick={openAccount}>
        <Shield size={14} /> Account
      </button>
      <button type="button" className="btn admin-btn account-btn" onClick={() => logout()}>
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}
