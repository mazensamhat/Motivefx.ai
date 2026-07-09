import { API_BASE } from "../config";
import { clearSession, getAccessToken, getRefreshToken, setSession, type AuthUser } from "./auth";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
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

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function authPublicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/auth${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

interface SessionResult {
  requires2fa?: boolean;
  pendingToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser | Record<string, unknown>;
}

export async function login(email: string, password: string): Promise<SessionResult> {
  return authPublicPost("/login", { email, password });
}

export async function register(
  email: string,
  password: string,
  acceptPrivacy: boolean,
  acceptTerms: boolean
): Promise<SessionResult> {
  return authPublicPost("/register", {
    email,
    password,
    accept_privacy: acceptPrivacy,
    accept_terms: acceptTerms,
  });
}

export async function verify2fa(pendingToken: string, code: string): Promise<SessionResult> {
  return authPublicPost("/login/2fa", { pending_token: pendingToken, code });
}

export async function persistSession(session: SessionResult): Promise<AuthUser | null> {
  const user = normalizeUser(session.user as Record<string, unknown> | undefined);
  if (session.accessToken && session.refreshToken && user) {
    await setSession(session.accessToken, session.refreshToken, user);
    return user;
  }
  return null;
}

export async function fetchProfile(): Promise<AuthUser> {
  const data = await apiGet<{ user?: Record<string, unknown> } & Record<string, unknown>>("/auth/me");
  const user = normalizeUser((data.user as Record<string, unknown> | undefined) ?? data);
  if (!user) throw new Error("Invalid profile response");
  return user;
}

export async function logout(): Promise<void> {
  const refresh = await getRefreshToken();
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ refresh_token: refresh }),
    });
  } catch {
    /* ok */
  }
  await clearSession();
}
