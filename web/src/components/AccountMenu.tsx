import { LayoutDashboard, LogIn, LogOut, Settings2, User } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { usePlatformPrefs } from "../hooks/usePlatformPrefs";
import { isNativeShell } from "../lib/nativeShell";

const SITE_EMBED = import.meta.env.BASE_URL === "/terminal/";

export function AccountMenu() {
  const { user, isAuthenticated, isAdmin, openAuth, openAccount, logout, loading } = useAuth();
  const { openSetup } = usePlatformPrefs();
  const isMobile = useMediaQuery("(max-width: 900px)");
  const compactChrome = isMobile || isNativeShell();

  if (loading) {
    return <span className="account-menu-loading">…</span>;
  }

  /* Mobile / native shell: Account + Sign out live in the More sheet only */
  if (compactChrome) {
    return null;
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
      {SITE_EMBED && isAdmin && (
        <a href="/admin" className="btn admin-btn account-btn ops-console-btn" title="Ops Console">
          <LayoutDashboard size={14} /> Ops
        </a>
      )}
      <button type="button" className="btn admin-btn account-btn account-apps-btn" onClick={openSetup}>
        <Settings2 size={14} /> Apps
      </button>
      <button type="button" className="btn admin-btn account-btn" onClick={openAccount}>
        <User size={14} /> Account
      </button>
      <button type="button" className="btn admin-btn account-btn" onClick={() => logout()}>
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
}
