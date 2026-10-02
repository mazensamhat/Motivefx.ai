import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  authGet,
  authPost,
  clearSession,
  getAccessToken,
  getAnonymousUserId,
  getRefreshToken,
  setSession,
  syncAuthUserId,
  type AuthUser,
} from "../lib/api";
import { resolveAcquisitionChannel } from "../lib/acquisition";
import {
  fetchSiteSessionUser,
  SITE_EMBED,
} from "../lib/siteSession";
import { invalidateAuthMe } from "../lib/authMe";
import { isNativeShell } from "../lib/nativeShell";
import { AuthModal } from "../components/AuthModal";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  openAuth: (mode?: "login" | "register") => void;
  openAccount: () => void;
  closeAccount: () => void;
  accountOpen: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const requestVersion = useRef(0);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [accountOpen, setAccountOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    const ticket = ++requestVersion.current;
    try {
      // The embedded app uses the signed server cookie, not a possibly stale token.
      if (SITE_EMBED) {
        const siteUser = await fetchSiteSessionUser(true);
        if (ticket !== requestVersion.current) return;
        if (siteUser) {
          syncAuthUserId(siteUser);
          setUser(siteUser); setIsAdmin(Boolean(siteUser.isAdmin));
        } else {
          clearSession(); setUser(null); setIsAdmin(false);
        }
      } else if (getAccessToken()) {
        const profile = await authGet<AuthUser>("/me");
        if (ticket !== requestVersion.current) return;
        syncAuthUserId(profile); setUser(profile);
      } else { setUser(null); setIsAdmin(false); }
      setError(null);
    } catch (e) {
      // Preserve the last verified in-memory identity; servers still enforce access.
      if (ticket === requestVersion.current) setError(e instanceof Error ? e.message : "Your session could not be checked. Please retry.");
    } finally { if (ticket === requestVersion.current) setLoading(false); }
  }, []);

  useEffect(() => { void refreshUser(); return () => { requestVersion.current++; }; }, [refreshUser]);

  const openAuth = useCallback((mode: "login" | "register" = "login") => {
    // Native shell: never navigate to /login?next=/app (blank / broken WebView).
    // Ask the Expo shell to show the native AuthScreen instead.
    if (isNativeShell()) {
      try {
        window.ReactNativeWebView?.postMessage("motivefx:logout");
      } catch {
        /* ignore */
      }
      return;
    }
    if (SITE_EMBED) {
      window.location.href = mode === "register" ? "/register?next=/terminal" : "/login?next=/terminal";
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const openAccount = useCallback(() => setAccountOpen(true), []);
  const closeAccount = useCallback(() => setAccountOpen(false), []);

  const logout = useCallback(async () => {
    requestVersion.current++;
    try {
      await authPost("/logout", { refresh_token: getRefreshToken() });
    } catch {
      /* ok */
    }
    invalidateAuthMe();
    clearSession();
    setError(null);
    setUser(null);
    setIsAdmin(false);
    if (isNativeShell()) {
      try {
        window.ReactNativeWebView?.postMessage("motivefx:logout");
      } catch {
        /* ignore */
      }
      return;
    }
    if (SITE_EMBED) {
      try {
        await fetch("/api/auth/logout", { method: "POST" });
      } catch {
        /* ok */
      }
      window.location.href = "/login";
    }
  }, []);

  const onAuthed = useCallback(
    async (session: {
      accessToken: string;
      refreshToken: string;
      user: AuthUser;
    }) => {
      requestVersion.current++;
      invalidateAuthMe();
      setError(null);
      setSession(session.accessToken, session.refreshToken, session.user);
      setUser(session.user);
      setAuthOpen(false);
      window.dispatchEvent(new Event("motivefx:auth-changed"));
    },
    []
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isAuthenticated: !!user,
      isAdmin,
      openAuth,
      openAccount,
      closeAccount,
      accountOpen,
      logout,
      refreshUser,
    }),
    [user, loading, error, isAdmin, openAuth, openAccount, closeAccount, accountOpen, logout, refreshUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {authOpen && (
        <AuthModal
          mode={authMode}
          onClose={() => setAuthOpen(false)}
          onSwitchMode={setAuthMode}
          onAuthed={onAuthed}
          anonymousUserId={getAnonymousUserId()}
          acquisitionChannel={resolveAcquisitionChannel()}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
