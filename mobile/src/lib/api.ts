import { API_BASE } from "../config";
import { clearSession, getAccessToken, getRefreshToken, setSession, type AuthUser } from "./auth";

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: await authHeaders() });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export async function authPublicPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/auth${path}`, {
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

interface SessionResult {
  requires2fa?: boolean;
  pendingToken?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: AuthUser;
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
  if (session.accessToken && session.refreshToken && session.user) {
    await setSession(session.accessToken, session.refreshToken, session.user);
    return session.user;
  }
  return null;
}

export async function logout(): Promise<void> {
  const refresh = await getRefreshToken();
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
  } catch {
    /* ok */
  }
  await clearSession();
}
