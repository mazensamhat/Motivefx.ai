import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  syncSiteEntitlementsFromServer,
  SITE_EMBED,
} from "../lib/siteSession";
import { isNativeShell } from "../lib/nativeShell";
import { AuthModal } from "../components/AuthModal";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [accountOpen, setAccountOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    if (getAccessToken()) {
      try {
        const profile = await authGet<AuthUser>("/me");
        syncAuthUserId(profile);
        setUser(profile);
        if (SITE_EMBED) {
          const siteUser = await fetchSiteSessionUser();
          setIsAdmin(Boolean(siteUser?.isAdmin));
        }
        return;
      } catch {
        clearSession();
      }
    }

    if (SITE_EMBED) {
      const siteUser = await fetchSiteSessionUser();
      if (siteUser) {
        syncAuthUserId({ userId: siteUser.userId, email: siteUser.email });
        setUser({ userId: siteUser.userId, email: siteUser.email, totpEnabled: siteUser.totpEnabled });
        setIsAdmin(Boolean(siteUser.isAdmin));
        return;
      }
    }

    setUser(null);
    setIsAdmin(false);
  }, []);

  useEffect(() => {
    (async () => {
      const sync = await syncSiteEntitlementsFromServer(true);
      if (sync.isAdmin) setIsAdmin(true);
      await refreshUser();
      // Don't fire entitlements-changed on cold boot — useModules already inits.
      // That event was re-triggering a second modules fetch and racing the pool.
      if (sync.ok) {
        window.dispatchEvent(new Event("motivefx:auth-changed"));
      }
    })().finally(() => setLoading(false));
  }, [refreshUser]);

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
    try {
      await authPost("/logout", { refresh_token: getRefreshToken() });
    } catch {
      /* ok */
    }
    clearSession();
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
      isAuthenticated: !!user,
      isAdmin,
      openAuth,
      openAccount,
      closeAccount,
      accountOpen,
      logout,
      refreshUser,
    }),
    [user, loading, isAdmin, openAuth, openAccount, closeAccount, accountOpen, logout, refreshUser]
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
