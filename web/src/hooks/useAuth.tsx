import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authGet, authPost, clearSession, getAccessToken, getAnonymousUserId, getRefreshToken, setSession, syncAuthUserId, type AuthUser } from "../lib/api";
import { resolveAcquisitionChannel } from "../lib/acquisition";
import { fetchAuthMe, invalidateAuthMe } from "../lib/authMe";
import { SITE_EMBED } from "../lib/siteSession";
import { isNativeShell } from "../lib/nativeShell";
import { AuthModal } from "../components/AuthModal";

interface AuthState {
  user: AuthUser | null; loading: boolean; error: string | null; isAuthenticated: boolean; isAdmin: boolean;
  openAuth: (mode?: "login" | "register") => void;
  openAccount: () => void; closeAccount: () => void; accountOpen: boolean;
  logout: () => Promise<void>; refreshUser: () => Promise<void>;
}
const AuthContext = createContext<AuthState | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [accountOpen, setAccountOpen] = useState(false);
  const sequence = useRef(0);

  const refreshUser = useCallback(async () => {
    const seq = ++sequence.current;
    setLoading(true); setError(null);
    try {
      if (SITE_EMBED) {
        // The site uses its httpOnly cookie, not potentially obsolete bridge tokens.
        // Identity and plan consumers share this single verified response.
        const data = await fetchAuthMe(true);
        if (seq !== sequence.current) return;
        if (data?.user?.id && data.user.email) {
          const profile = { userId: data.user.id, email: data.user.email, totpEnabled: Boolean(data.user.totpEnabled) };
          syncAuthUserId(profile); setUser(profile); setIsAdmin(Boolean(data.user.isAdmin));
        } else {
          clearSession(); setUser(null); setIsAdmin(false);
        }
      } else if (getAccessToken()) {
        const profile = await authGet<AuthUser>("/me");
        if (seq !== sequence.current) return;
        syncAuthUserId(profile); setUser(profile); setIsAdmin(false);
      } else {
        if (seq !== sequence.current) return;
        setUser(null); setIsAdmin(false);
      }
    } catch {
      if (seq === sequence.current) {
        // Do not delete tokens or falsely demote a verified user after a network/DB failure.
        setError("Session verification is temporarily unavailable. Your account and plan have not been changed. Retry to restore access.");
      }
    } finally {
      if (seq === sequence.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refreshUser();
    return () => { sequence.current += 1; };
  }, [refreshUser]);

  const openAuth = useCallback((mode: "login" | "register" = "login") => {
    if (isNativeShell()) {
      try { window.ReactNativeWebView?.postMessage("motivefx:logout"); } catch { /* Native host may not be available. */ }
      return;
    }
    if (SITE_EMBED) {
      window.location.href = mode === "register" ? "/register?next=/terminal" : "/login?next=/terminal";
      return;
    }
    setAuthMode(mode); setAuthOpen(true);
  }, []);
  const openAccount = useCallback(() => setAccountOpen(true), []);
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  const logout = useCallback(async () => {
    sequence.current += 1;
    invalidateAuthMe();
    try { await authPost("/logout", { refresh_token: getRefreshToken() }); } catch { /* Explicit user logout remains available. */ }
    clearSession(); setUser(null); setIsAdmin(false); setError(null); setLoading(false);
    if (isNativeShell()) {
      try { window.ReactNativeWebView?.postMessage("motivefx:logout"); } catch { /* Native host may not be available. */ }
      return;
    }
    if (SITE_EMBED) {
      try { await fetch("/api/auth/logout", { method: "POST" }); } catch { /* Login page can retry server logout. */ }
      window.location.href = "/login";
    }
  }, []);
  const onAuthed = useCallback(async (session: { accessToken: string; refreshToken: string; user: AuthUser }) => {
    sequence.current += 1; invalidateAuthMe();
    setSession(session.accessToken, session.refreshToken, session.user);
    setUser(session.user); setAuthOpen(false); setError(null); setLoading(false);
    window.dispatchEvent(new Event("motivefx:auth-changed"));
  }, []);
  const value = useMemo(() => ({ user, loading, error, isAuthenticated: !!user, isAdmin, openAuth, openAccount, closeAccount, accountOpen, logout, refreshUser }),
    [user, loading, error, isAdmin, openAuth, openAccount, closeAccount, accountOpen, logout, refreshUser]);
  // Hold dependent feeds during boot. Unknown authentication is neither a guest demo nor a paywall.
  const waiting = loading && !user;
  return <AuthContext.Provider value={value}>
    {waiting || error ? <main className="app" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "1.5rem" }}>
      <section className="glass-panel" role={error ? "alert" : "status"} style={{ maxWidth: "36rem", padding: "2rem" }}>
        <h1>MotiveFX</h1>
        <h2>{error ? "We could not verify your session" : "Restoring your secure session"}</h2>
        <p>{error ?? "Checking your existing account and market access. This check has a time limit."}</p>
        {error && <button type="button" className="btn btn-ghost" disabled={loading} onClick={() => void refreshUser()}>{loading ? "Checking…" : "Retry session check"}</button>}
      </section>
    </main> : children}
    {authOpen && <AuthModal mode={authMode} onClose={() => setAuthOpen(false)} onSwitchMode={setAuthMode} onAuthed={onAuthed} anonymousUserId={getAnonymousUserId()} acquisitionChannel={resolveAcquisitionChannel()} />}
  </AuthContext.Provider>;
}
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
