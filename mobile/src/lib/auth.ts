/**
 * Session storage via AsyncStorage (no SecureStore native module).
 * SecureStore was crashing Android on cold start for this project.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE } from "../config";

const ACCESS_KEY = "motivefx_access_token";
const REFRESH_KEY = "motivefx_refresh_token";
const USER_KEY = "motivefx_auth_user_id";
const USER_JSON_KEY = "motivefx_auth_user_json";
const HANDOFF_TIMEOUT_MS = 12_000;

export interface AuthUser {
  userId: string;
  email: string;
  displayName?: string | null;
  totpEnabled?: boolean;
}

async function safeGet(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    console.warn(`AsyncStorage get failed for ${key}`, e);
    return null;
  }
}

async function safeSet(key: string, value: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, value);
  } catch (e) {
    console.warn(`AsyncStorage set failed for ${key}`, e);
  }
}

async function safeDelete(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn(`AsyncStorage delete failed for ${key}`, e);
  }
}

/** Raw bearer used only by native API requests, never by WebView URLs. */
export async function getStoredAccessToken(): Promise<string | null> {
  return safeGet(ACCESS_KEY);
}

/** Raw refresh credential used only by the native API refresh path. */
export async function getStoredRefreshToken(): Promise<string | null> {
  return safeGet(REFRESH_KEY);
}

async function fetchWithSoftTimeout(url: string, init: RequestInit): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch(url, init),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("handoff_timeout")), HANDOFF_TIMEOUT_MS);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function refreshStoredSession(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;
  try {
    const res = await fetchWithSoftTimeout(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
      user?: { userId?: string; id?: string; email?: string; displayName?: string | null };
    };
    const userId = String(body.user?.userId ?? body.user?.id ?? "");
    const email = String(body.user?.email ?? "");
    if (!body.accessToken || !body.refreshToken || !userId || !email) return null;
    await setSession(body.accessToken, body.refreshToken, {
      userId,
      email,
      displayName: body.user?.displayName ?? null,
    });
    return body.accessToken;
  } catch {
    return null;
  }
}

async function requestHandoffTicket(accessToken: string): Promise<string | null> {
  try {
    const res = await fetchWithSoftTimeout(`${API_BASE}/auth/native-handoff`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ next: "/terminal" }),
    });
    if (res.status === 401) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { url?: string };
    if (!body.url) return null;
    try {
      return new URL(body.url).searchParams.get("ticket");
    } catch {
      const match = /[?&]ticket=([^&]+)/.exec(body.url);
      return match?.[1] ? decodeURIComponent(match[1]) : null;
    }
  } catch {
    return null;
  }
}

/**
 * TerminalScreen intentionally imports this historical name. It now returns a
 * two-minute, one-time handoff ticket instead of the stored bearer token, so the
 * WebView URL and localStorage never receive the long-lived session credential.
 */
export async function getAccessToken(): Promise<string | null> {
  let accessToken = await getStoredAccessToken();
  if (!accessToken) return null;

  let ticket = await requestHandoffTicket(accessToken);
  if (ticket) return ticket;

  accessToken = await refreshStoredSession();
  if (!accessToken) return null;
  ticket = await requestHandoffTicket(accessToken);
  return ticket;
}

/**
 * TerminalScreen also imports this historical name for WebView injection. Never
 * expose the native refresh credential to WebView JavaScript/localStorage.
 */
export async function getRefreshToken(): Promise<string | null> {
  return null;
}

export async function getUserId(): Promise<string | null> {
  return safeGet(USER_KEY);
}

export async function setSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser
): Promise<void> {
  await safeSet(ACCESS_KEY, accessToken);
  await safeSet(REFRESH_KEY, refreshToken);
  await safeSet(USER_KEY, user.userId);
  await safeSet(USER_JSON_KEY, JSON.stringify(user));
}

/** Last-known profile so app boot never blocks on the network. */
export async function getCachedUser(): Promise<AuthUser | null> {
  const raw = await safeGet(USER_JSON_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (parsed && typeof parsed.userId === "string" && typeof parsed.email === "string") {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  await safeDelete(ACCESS_KEY);
  await safeDelete(REFRESH_KEY);
  await safeDelete(USER_KEY);
  await safeDelete(USER_JSON_KEY);
}
