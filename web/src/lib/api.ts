const USER_KEY = "motivefx_user_id";
const AUTH_USER_KEY = "motivefx_auth_user_id";
const ACCESS_KEY = "motivefx_access_token";
const REFRESH_KEY = "motivefx_refresh_token";

export interface AuthUser {
  userId: string;
  email: string;
  displayName?: string | null;
  totpEnabled?: boolean;
}

function anonymousUserId(): string {
  let id = localStorage.getItem(USER_KEY);
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export function getUserId(): string {
  return localStorage.getItem(AUTH_USER_KEY) || anonymousUserId();
}

export function getAnonymousUserId(): string {
  return anonymousUserId();
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function hasAuthSession(): boolean {
  return !!getAccessToken();
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function setSession(
  accessToken: string,
  refreshToken: string,
  user: AuthUser
): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(AUTH_USER_KEY, user.userId);
}

/** Keep local user id aligned with the JWT profile (fixes stale anonymous ids). */
export function syncAuthUserId(user: AuthUser): void {
  localStorage.setItem(AUTH_USER_KEY, user.userId);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-User-Id": getUserId(),
    ...extra,
  };
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;
  try {
    const res = await fetch("/api/terminal-auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    localStorage.setItem(ACCESS_KEY, data.accessToken);
    localStorage.setItem(REFRESH_KEY, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithAuth(input: string, init: RequestInit, retry = true): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && retry && getRefreshToken()) {
    const ok = await refreshAccessToken();
    if (ok) {
      const headers = { ...(init.headers as Record<string, string>), ...buildHeaders() };
      return fetch(input, { ...init, headers });
    }
    clearSession();
  }
  return res;
}

async function parseApiError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  const detail = (err as { detail?: unknown }).detail;
  if (typeof detail === "object" && detail && "message" in detail) {
    return String((detail as { message: string }).message);
  }
  if (typeof detail === "string") return detail;
  return `Request failed: ${res.status}`;
}

function siteEmbedApiPath(path: string): string {
  return `/api${path}`;
}

function usesSiteCookieAuth(_path: string): boolean {
  return import.meta.env.BASE_URL === "/terminal/";
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const url = siteEmbedApiPath(path);
  const res = await fetchWithAuth(url, {
    method: "POST",
    headers: usesSiteCookieAuth(path) ? { "Content-Type": "application/json" } : buildHeaders(),
    body: JSON.stringify(body),
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

export async function apiGet<T>(path: string): Promise<T> {
  const sep = path.includes("?") ? "&" : "?";
  const withUser = path.includes("user_id=") ? path : `${path}${sep}user_id=${encodeURIComponent(getUserId())}`;
  const url = siteEmbedApiPath(withUser);
  const res = await fetchWithAuth(url, {
    headers: usesSiteCookieAuth(path)
      ? { "Content-Type": "application/json" }
      : buildHeaders({ "Content-Type": "application/json" }),
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(await parseApiError(res));
  return res.json() as Promise<T>;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetchWithAuth(siteEmbedApiPath(path), {
    method: "DELETE",
    headers: usesSiteCookieAuth(path) ? { "Content-Type": "application/json" } : buildHeaders(),
    credentials: "same-origin",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function authPublicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/terminal-auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function authPost<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetchWithAuth(`/api/terminal-auth${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export async function authGet<T>(path: string): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const res = await fetchWithAuth(`/api/terminal-auth${path}`, {
    headers: buildHeaders(),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
