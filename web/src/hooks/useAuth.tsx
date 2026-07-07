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
import { AccountSettingsModal } from "../components/AccountSettingsModal";
import { AuthModal } from "../components/AuthModal";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  openAuth: (mode?: "login" | "register") => void;
  openAccount: () => void;
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
        setUser({ userId: siteUser.userId, email: siteUser.email });
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
      if (sync.ok) {
        window.dispatchEvent(new Event("motivefx:auth-changed"));
        window.dispatchEvent(new Event("motivefx:entitlements-changed"));
      }
    })().finally(() => setLoading(false));
  }, [refreshUser]);

  const openAuth = useCallback((mode: "login" | "register" = "login") => {
    if (SITE_EMBED) {
      window.location.href = mode === "register" ? "/register?next=/app" : "/login?next=/app";
      return;
    }
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const openAccount = useCallback(() => setAccountOpen(true), []);

  const logout = useCallback(async () => {
    try {
      await authPost("/logout", { refresh_token: getRefreshToken() });
    } catch {
      /* ok */
    }
    clearSession();
    setUser(null);
    setIsAdmin(false);
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
      logout,
      refreshUser,
    }),
    [user, loading, isAdmin, openAuth, openAccount, logout, refreshUser]
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
      {accountOpen && user && (
        <AccountSettingsModal
          user={user}
          onClose={() => setAccountOpen(false)}
          onLogout={logout}
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
