import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getAccessToken, getCachedUser, type AuthUser } from "../lib/auth";
import { ApiError, fetchProfile, logout as apiLogout } from "../lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [token, cached] = await Promise.all([getAccessToken(), getCachedUser()]);
          if (!token) {
            if (!cancelled) setUser(null);
            return;
          }

          // Boot from the cached profile instantly — never block the UI on a
          // network roundtrip (Play "app not responding" policy).
          if (cached && !cancelled) {
            setUser(cached);
            setLoading(false);
          }

          try {
            const profile = await fetchProfile();
            if (!cancelled) setUser(profile);
          } catch (e) {
            // Only a definitive auth rejection ends the session; network
            // failures/timeouts keep the cached session so the app stays usable.
            const unauthorized = e instanceof ApiError && (e.status === 401 || e.status === 403);
            if (unauthorized) {
              try {
                await apiLogout();
              } catch {
                /* ignore */
              }
              if (!cancelled) setUser(null);
            } else if (!cached) {
              if (!cancelled) setUser(null);
            }
          }
        } catch (e) {
          console.warn("Auth boot failed", e);
          if (!cancelled) setUser(null);
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }, 0);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (e) {
      console.warn("Logout failed", e);
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      setUser,
      logout,
    }),
    [user, loading, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
