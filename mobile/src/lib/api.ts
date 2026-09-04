import { API_BASE } from "../config";
import {
  clearSession,
  getStoredAccessToken,
  getStoredRefreshToken,
  setSession,
  type AuthUser,
} from "./auth";

const FETCH_TIMEOUT_MS = 15_000;
const AUTH_TIMEOUT_MS = 25_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function mapNetworkError(e: unknown): Error {
  if (e instanceof ApiError) return e;
  const msg = e instanceof Error ? e.message : String(e ?? "Unknown error");
  const name = e instanceof Error ? e.name : "";
  const lower = msg.toLowerCase();

  if (
    name === "AbortError" ||
    lower.includes("aborted") ||
    lower.includes("canceled") ||
    lower.includes("cancelled") ||
    msg === "TIMEOUT"
  ) {
    return new Error("Sign-in timed out or was interrupted. Check your connection and try again.");
  }
  if (
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("network error")
  ) {
    return new Error("Could not reach MotiveFX servers. Check your connection and try again.");
  }
  return e instanceof Error ? e : new Error(msg);
}

function isRetryableNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  const name = e instanceof Error ? e.name : "";
  const lower = msg.toLowerCase();
  return (
    name === "AbortError" ||
    msg === "TIMEOUT" ||
    lower.includes("aborted") ||
    lower.includes("canceled") ||
    lower.includes("cancelled") ||
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("timeout")
  );
}

export async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      fetch(url, init),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          reject(new Error("TIMEOUT"));
        }, timeoutMs);
      }),
    ]);
    return response;
  } catch (e) {
    if (timedOut || (e instanceof Error && e.message === "TIMEOUT")) {
      throw new Error("Network timeout — check your connection and try again.");
    }
    throw mapNetworkError(e);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function headersWithToken(token: string | null, extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return headers;
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getStoredAccessToken();
  const headers = headersWithToken(token);
  return Object.fromEntries(headers.entries());
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  const detail = (err as { detail?: unknown }).detail;
  if (typeof detail === "string" && detail) return detail;
  const error = (err as { error?: unknown }).error;
  if (typeof error === "string" && error) return error;
  return `Request failed: ${res.status}`;
}

function normalizeUser(raw: Record<string, unknown> | undefined): AuthUser | null {
  if (!raw) return null;
  const userId = String(raw.userId ?? raw.id ?? "");
  const email = String(raw.email ?? "");
  if (!userId || !email) return null;
  return {
    userId,
    email,
    displayName: (raw.displayName as string | null | undefined) ?? null,
    totpEnabled: Boolean(raw.totpEnabled),
  };
}

interface SessionResult {
  requires2fa?: boolean;
  pendingToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser | Record<string, unknown>;
}

export async function persistSession(session: SessionResult): Promise<AuthUser | null> {
  const user = normalizeUser(session.user as Record<string, unknown> | undefined);
  if (session.accessToken && session.refreshToken && user) {
    await setSession(session.accessToken, session.refreshToken, user);
    return user;
  }
  return null;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await getStoredRefreshToken();
  if (!refreshToken) return null;

  const res = await fetchWithTimeout(
    `${API_BASE}/auth/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
    AUTH_TIMEOUT_MS
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) await clearSession();
    return null;
  }

  const session = (await res.json()) as SessionResult;
  const user = await persistSession(session);
  return user && session.accessToken ? session.accessToken : null;
}

export async function authenticatedFetch(
  url: string,
  init: RequestInit = {},
  timeoutMs = FETCH_TIMEOUT_MS
): Promise<Response> {
  let token = await getStoredAccessToken();
  let res = await fetchWithTimeout(
    url,
    { ...init, headers: headersWithToken(token, init.headers) },
    timeoutMs
  );
  if (res.status !== 401) return res;

  token = await refreshAccessToken();
  if (!token) return res;
  res = await fetchWithTimeout(
    url,
    { ...init, headers: headersWithToken(token, init.headers) },
    timeoutMs
  );
  return res;
}

export async function apiGet<T>(path: string): Promise<T> {
  try {
    const res = await authenticatedFetch(`${API_BASE}${path}`);
    if (!res.ok) throw new ApiError(await readError(res), res.status);
    return res.json();
  } catch (e) {
    throw mapNetworkError(e);
  }
}

export async function authPublicPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${API_BASE}/auth${path}`;
  let lastError: unknown;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(body),
        },
        AUTH_TIMEOUT_MS
      );
      if (!res.ok) throw new Error(await readError(res));
      return res.json();
    } catch (e) {
      lastError = e;
      if (e instanceof Error && !isRetryableNetworkError(e) && !/timeout/i.test(e.message)) {
        throw mapNetworkError(e);
      }
      if (attempt === 0 && isRetryableNetworkError(e)) {
        await delay(500);
        continue;
      }
      throw mapNetworkError(e);
    }
  }

  throw mapNetworkError(lastError);
}

export async function login(email: string, password: string): Promise<SessionResult> {
  return authPublicPost("/login", { email: email.trim().toLowerCase(), password });
}

export async function register(
  email: string,
  password: string,
  acceptPrivacy: boolean,
  acceptTerms: boolean
): Promise<SessionResult> {
  return authPublicPost("/register", {
    email: email.trim().toLowerCase(),
    password,
    accept_privacy: acceptPrivacy,
    accept_terms: acceptTerms,
  });
}

export async function verify2fa(pendingToken: string, code: string): Promise<SessionResult> {
  return authPublicPost("/login/2fa", { pending_token: pendingToken, code });
}

export async function createNativeHandoffUrl(next = "/terminal"): Promise<string | null> {
  const res = await authenticatedFetch(
    `${API_BASE}/auth/native-handoff`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ next }),
    },
    AUTH_TIMEOUT_MS
  );
  if (!res.ok) return null;
  const body = (await res.json().catch(() => ({}))) as { url?: string };
  return typeof body.url === "string" && body.url ? body.url : null;
}

export async function fetchProfile(): Promise<AuthUser> {
  const data = await apiGet<{ user?: Record<string, unknown> } & Record<string, unknown>>("/auth/me");
  const user = normalizeUser((data.user as Record<string, unknown> | undefined) ?? data);
  if (!user) throw new Error("Invalid profile response");
  return user;
}

export async function logout(): Promise<void> {
  const refresh = await getStoredRefreshToken();
  try {
    await fetchWithTimeout(
      `${API_BASE}/auth/logout`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ refresh_token: refresh }),
      },
      8_000
    );
  } catch {
    /* ok */
  }
  await clearSession();
}
