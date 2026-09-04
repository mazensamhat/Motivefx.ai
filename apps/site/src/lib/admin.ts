import { getSession } from "@/lib/session";
import { findUserSafeCached } from "@/lib/load-user";
import {
  adminActorFromSession,
  actorHas,
  type OpsCapability,
} from "@/lib/ops/rbac";

/** Comma-separated admin emails in ADMIN_EMAILS (case-insensitive). */
export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  const admins = getAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  // Do not authorize Ops from a stale 30-day JWT alone. A disabled account or
  // an account whose email changed must lose admin access without waiting for
  // the token to expire. Cached lookup keeps this to roughly one DB read per
  // warm isolate/user every 45 seconds rather than one read per Ops request.
  const currentUser = await findUserSafeCached({ id: session.id }, { timeoutMs: 5_000 });
  if (
    !currentUser ||
    currentUser.disabledAt ||
    currentUser.email.trim().toLowerCase() !== session.email.trim().toLowerCase()
  ) {
    return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  }

  if (!isAdminEmail(currentUser.email)) {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }

  return {
    ok: true as const,
    session: { id: currentUser.id, email: currentUser.email },
  };
}

/** Admin email gate + capability check (full admin grant until multi-role lands). */
export async function requireAdminCapability(capability: OpsCapability) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const actor = adminActorFromSession(auth.session);
  if (!actorHas(actor, capability)) {
    return {
      ok: false as const,
      status: 403 as const,
      error: `Missing capability: ${capability}`,
    };
  }
  return { ok: true as const, session: auth.session, actor };
}

export function getAdminApiKey(): string | null {
  const key = process.env.ADMIN_API_KEY?.trim();
  return key || null;
}
