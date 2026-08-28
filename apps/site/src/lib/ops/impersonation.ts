/**
 * Secure impersonation sessions (Ops Master Plan §54–58).
 * Signed cookie is source of truth (survives serverless cold starts).
 * Never uses the user's password.
 */

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { ImpersonationMode, ImpersonationSession } from "./rbac";
import { recordAudit } from "./audit";
import { recordTelemetry } from "./telemetry-envelope";
import type { SessionUser } from "@/lib/session";
import { getSession } from "@/lib/session";

export const IMPERSONATION_COOKIE = "motivefx_impersonation";
const DEFAULT_TTL_MS = 30 * 60 * 1000;

type ImpersonationClaims = {
  operatorId: string;
  operatorEmail: string;
  effectiveUserId: string;
  effectiveUserEmail: string;
  mode: ImpersonationMode;
  reason: string;
  sessionId: string;
  ticketId?: string;
  startedAt: string;
};

function getSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function toSession(claims: ImpersonationClaims, exp: number): ImpersonationSession {
  return {
    authenticatedActorId: claims.operatorId,
    effectiveUserId: claims.effectiveUserId,
    impersonationSessionId: claims.sessionId,
    mode: claims.mode,
    reason: claims.reason,
    ticketId: claims.ticketId,
    startedAt: claims.startedAt,
    expiresAt: new Date(exp * 1000).toISOString(),
  };
}

export async function readImpersonationCookie(): Promise<{
  session: ImpersonationSession;
  effectiveUserEmail: string;
  operatorEmail: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(IMPERSONATION_COOKIE)?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, getSecret());
    const operatorId = typeof payload.operatorId === "string" ? payload.operatorId : null;
    const operatorEmail = typeof payload.operatorEmail === "string" ? payload.operatorEmail : null;
    const effectiveUserId =
      typeof payload.effectiveUserId === "string" ? payload.effectiveUserId : null;
    const effectiveUserEmail =
      typeof payload.effectiveUserEmail === "string" ? payload.effectiveUserEmail : null;
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId : null;
    const mode = (typeof payload.mode === "string" ? payload.mode : "VIEW_AS_USER") as ImpersonationMode;
    const reason = typeof payload.reason === "string" ? payload.reason : "";
    const startedAt =
      typeof payload.startedAt === "string" ? payload.startedAt : new Date().toISOString();
    const exp = typeof payload.exp === "number" ? payload.exp : 0;
    if (!operatorId || !operatorEmail || !effectiveUserId || !effectiveUserEmail || !sessionId || !exp) {
      return null;
    }
    if (exp * 1000 < Date.now()) return null;
    return {
      session: toSession(
        {
          operatorId,
          operatorEmail,
          effectiveUserId,
          effectiveUserEmail,
          mode,
          reason,
          sessionId,
          ticketId: typeof payload.ticketId === "string" ? payload.ticketId : undefined,
          startedAt,
        },
        exp
      ),
      effectiveUserEmail,
      operatorEmail,
    };
  } catch {
    return null;
  }
}

async function writeImpersonationCookie(claims: ImpersonationClaims, ttlMs: number) {
  const token = await new SignJWT({
    operatorId: claims.operatorId,
    operatorEmail: claims.operatorEmail,
    effectiveUserId: claims.effectiveUserId,
    effectiveUserEmail: claims.effectiveUserEmail,
    mode: claims.mode,
    reason: claims.reason,
    sessionId: claims.sessionId,
    ticketId: claims.ticketId,
    startedAt: claims.startedAt,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${Math.ceil(ttlMs / 1000)}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: Math.ceil(ttlMs / 1000),
    path: "/",
  });
}

export async function clearImpersonationCookie() {
  const cookieStore = await cookies();
  cookieStore.set(IMPERSONATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}

export async function getActiveImpersonation(
  operatorId: string
): Promise<(ImpersonationSession & { effectiveUserEmail: string }) | null> {
  const read = await readImpersonationCookie();
  if (!read) return null;
  if (read.session.authenticatedActorId !== operatorId) return null;
  return { ...read.session, effectiveUserEmail: read.effectiveUserEmail };
}

/**
 * Session for customer-facing surfaces (/app, terminal APIs, auth/me).
 * When an admin is impersonating, returns the effective (customer) user.
 * Admin Ops APIs must keep using getSession() for the authenticated operator.
 */
export async function getEffectiveSession(): Promise<
  (SessionUser & { impersonating?: boolean; operatorId?: string }) | null
> {
  const actor = await getSession();
  if (!actor) return null;
  const imp = await getActiveImpersonation(actor.id);
  if (!imp) return actor;
  return {
    id: imp.effectiveUserId,
    email: imp.effectiveUserEmail,
    impersonating: true,
    operatorId: actor.id,
  };
}

export async function startImpersonation(input: {
  operatorId: string;
  operatorEmail: string;
  effectiveUserId: string;
  effectiveUserEmail: string;
  mode?: ImpersonationMode;
  reason: string;
  ticketId?: string;
  ttlMs?: number;
}): Promise<ImpersonationSession> {
  const existing = await getActiveImpersonation(input.operatorId);
  if (existing) {
    await endImpersonation(input.operatorId, input.operatorEmail, "replaced");
  }

  const ttlMs = input.ttlMs ?? DEFAULT_TTL_MS;
  const now = Date.now();
  const sessionId = newId();
  const mode = input.mode ?? "VIEW_AS_USER";
  const reason = input.reason.trim() || "Support investigation";

  const session: ImpersonationSession = {
    authenticatedActorId: input.operatorId,
    effectiveUserId: input.effectiveUserId,
    impersonationSessionId: sessionId,
    mode,
    reason,
    ticketId: input.ticketId,
    startedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttlMs).toISOString(),
  };

  await writeImpersonationCookie(
    {
      operatorId: input.operatorId,
      operatorEmail: input.operatorEmail,
      effectiveUserId: input.effectiveUserId,
      effectiveUserEmail: input.effectiveUserEmail,
      mode,
      reason,
      sessionId,
      ticketId: input.ticketId,
      startedAt: session.startedAt,
    },
    ttlMs
  );

  recordAudit({
    actorId: input.operatorId,
    actorEmail: input.operatorEmail,
    action: "ops.impersonation.started",
    capability: "impersonate_user_readonly",
    targetType: "user",
    targetId: input.effectiveUserId,
    reason: `${reason} (${input.effectiveUserEmail})`,
    result: "success",
    after: { mode: session.mode, expiresAt: session.expiresAt },
  });

  recordTelemetry({
    eventName: "ops.impersonation.started",
    userId: input.operatorId,
    sourceClass: "ops",
    privacyClass: "sensitive",
    metadata: {
      effectiveUserId: input.effectiveUserId,
      mode: session.mode,
      sessionId: session.impersonationSessionId,
    },
  });

  return session;
}

export async function endImpersonation(
  operatorId: string,
  operatorEmail: string,
  reason = "operator_exit"
): Promise<ImpersonationSession | null> {
  const session = await getActiveImpersonation(operatorId);
  await clearImpersonationCookie();
  if (!session) return null;

  recordAudit({
    actorId: operatorId,
    actorEmail: operatorEmail,
    action: "ops.impersonation.ended",
    capability: "impersonate_user_readonly",
    targetType: "user",
    targetId: session.effectiveUserId,
    reason,
    result: "success",
    before: { mode: session.mode, startedAt: session.startedAt },
  });

  recordTelemetry({
    eventName: "ops.impersonation.ended",
    userId: operatorId,
    sourceClass: "ops",
    privacyClass: "sensitive",
    metadata: { sessionId: session.impersonationSessionId, reason },
  });

  return session;
}

/** Restricted actions while impersonating (Ops Master Plan §57). */
export const IMPERSONATION_BLOCKED_ACTIONS = [
  "payment_method_change",
  "account_deletion",
  "credential_change",
  "sensitive_export",
  "subscription_purchase",
  "security_change",
  "api_key_access",
] as const;

export async function assertNotImpersonatingBlocked(action: (typeof IMPERSONATION_BLOCKED_ACTIONS)[number]) {
  const actor = await getSession();
  if (!actor) return;
  const imp = await getActiveImpersonation(actor.id);
  if (!imp) return;
  if ((IMPERSONATION_BLOCKED_ACTIONS as readonly string[]).includes(action)) {
    throw new Error(`Action blocked while impersonating: ${action}`);
  }
}
