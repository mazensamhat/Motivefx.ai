import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { InteractionManager, Platform } from "react-native";
import { getAccessToken, type AuthUser } from "../lib/auth";
import { fetchProfile, logout as apiLogout } from "../lib/api";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Paint Auth UI immediately. Session restore is deferred so SecureStore /
  // network work does not run during Android Application/Activity create
  // (that path causes the clear-cache crash loop on some devices).
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const task = InteractionManager.runAfterInteractions(() => {
      timeoutId = setTimeout(() => {
        void (async () => {
          try {
            const token = await getAccessToken();
            if (!token || cancelled) return;
            try {
              const profile = await fetchProfile();
              if (!cancelled) setUser(profile);
            } catch {
              try {
                await apiLogout();
              } catch {
                /* ignore */
              }
              if (!cancelled) setUser(null);
            }
          } catch (e) {
            console.warn("Auth boot failed", e);
            if (!cancelled) setUser(null);
          }
        })();
      }, Platform.OS === "android" ? 400 : 100);
    });

    return () => {
      cancelled = true;
      task.cancel();
      if (timeoutId) clearTimeout(timeoutId);
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
