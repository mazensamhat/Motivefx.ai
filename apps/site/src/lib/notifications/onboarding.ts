import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@motivefx/database";
import { emailHash } from "./policy";
import { notificationStorageEnabled, notificationSendingEnabled } from "./store";
import { planForUser } from "../terminal/plan";

export type VerificationPurpose = "account" | "daily_email";
export function emailVerificationEnabled() {
  return notificationStorageEnabled() && process.env.MOTIVE_EMAIL_VERIFICATION_ENABLED === "true";
}
export function verificationTokenHash(token: string) {
  return createHash("sha256").update(`motivefx-email-verification-v1:${token}`).digest("hex");
}
export function validVerificationToken(token: string) { return /^mfxverify_[A-Za-z0-9_-]{43}$/.test(token); }
export function sameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("origin");
  return !origin || origin === new URL(request.url).origin;
}
export function onboardingActive() { return emailVerificationEnabled() && notificationSendingEnabled(); }

export async function prepareEmailVerification(userId: string, purpose: VerificationPurpose, now = new Date()) {
  if (!onboardingActive()) return { state: "inactive" as const };
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.disabledAt) return { state: "unavailable" as const };
    if (purpose === "daily_email" && !planForUser(user).features.motive_daily_email) return { state: "not_entitled" as const };
    const consent = await tx.notificationConsent.findUnique({ where: { userId } });
    if (purpose === "daily_email" && consent?.emailSuppressedAt) return { state: "suppressed" as const };
    const recent = await tx.emailVerificationChallenge.findFirst({ where: { userId, purpose }, orderBy: { createdAt: "desc" } });
    const count = await tx.emailVerificationChallenge.count({ where: { userId, createdAt: { gte: new Date(now.getTime() - 60 * 60_000) } } });
    if ((recent && now.getTime() - recent.createdAt.getTime() < 60_000) || count >= 5) return { state: "rate_limited" as const };
    const token = `mfxverify_${randomBytes(32).toString("base64url")}`;
    const tokenHash = verificationTokenHash(token);
    await tx.emailVerificationChallenge.updateMany({ where: { userId, purpose, usedAt: null }, data: { usedAt: now } });
    await tx.emailVerificationChallenge.create({ data: { tokenHash, userId, purpose, emailHash: emailHash(user.email), createdAt: now, expiresAt: new Date(now.getTime() + 30 * 60_000) } });
    return { state: "prepared" as const, token, tokenHash, email: user.email, purpose };
  });
}

export async function confirmEmailVerification(token: string, now = new Date()) {
  if (!emailVerificationEnabled()) return { state: "inactive" as const };
  if (!validVerificationToken(token)) return { state: "invalid" as const };
  const tokenHash = verificationTokenHash(token);
  const hint = await prisma.emailVerificationChallenge.findUnique({ where: { tokenHash }, select: { userId: true } });
  if (!hint) return { state: "invalid" as const };
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${hint.userId} FOR UPDATE`;
    const challenge = await tx.emailVerificationChallenge.findUnique({ where: { tokenHash } });
    if (!challenge || challenge.usedAt || challenge.expiresAt <= now || challenge.createdAt > now) return { state: "invalid" as const };
    const user = await tx.user.findUnique({ where: { id: challenge.userId } });
    if (!user || user.disabledAt || emailHash(user.email) !== challenge.emailHash || !["account", "daily_email"].includes(challenge.purpose)) return { state: "invalid" as const };
    const claim = await tx.emailVerificationChallenge.updateMany({ where: { tokenHash, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
    if (claim.count !== 1) return { state: "invalid" as const };
    await tx.emailVerification.upsert({ where: { userId: user.id }, create: { userId: user.id, emailHash: challenge.emailHash, verifiedAt: now }, update: { emailHash: challenge.emailHash, verifiedAt: now } });
    if (challenge.purpose === "daily_email") {
      const consent = await tx.notificationConsent.findUnique({ where: { userId: user.id } });
      if (!planForUser(user).features.motive_daily_email || consent?.emailSuppressedAt || (consent?.dailyEmailRevokedAt && consent.dailyEmailRevokedAt >= challenge.createdAt)) return { state: "verified_without_subscription" as const };
      const confirmed = { dailyEmailConsentAt: challenge.createdAt, dailyEmailConfirmedAt: now, confirmedEmailHash: challenge.emailHash };
      await tx.notificationConsent.upsert({ where: { userId: user.id }, create: { userId: user.id, ...confirmed }, update: confirmed });
      return { state: "subscribed" as const };
    }
    return { state: "verified" as const };
  });
}

export async function revokeNotificationChannel(userId: string, channel: "daily_email" | "expo_push", now = new Date()) {
  if (!notificationStorageEnabled()) return false;
  await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const data = channel === "daily_email" ? { dailyEmailRevokedAt: now } : { pushRevokedAt: now };
    await tx.notificationConsent.upsert({ where: { userId }, create: { userId, ...data }, update: data });
    if (channel === "expo_push") await tx.notificationDevice.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.notificationDelivery.updateMany({ where: { userId, channel, state: { in: ["queued", "retry"] } }, data: { state: "suppressed", lastCode: "consent_revoked" } });
  });
  return true;
}

/** iOS remains the free reader. Device endpoints never inherit paid web access. */
export async function registerPushDevice(userId: string, input: { token: string; platform: string; permission: string }, now = new Date()) {
  if (!notificationStorageEnabled() || process.env.MOTIVE_PUSH_REGISTRATION_ENABLED !== "true") return { state: "inactive" as const };
  if (input.platform !== "android") return { state: "unsupported_platform" as const };
  if (input.permission !== "granted" || !/^(?:ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{8,200}\]$/.test(input.token)) return { state: "permission_required" as const };
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user || user.disabledAt || !planForUser(user).features.push_notifications) return { state: "not_entitled" as const };
    const existing = await tx.notificationDevice.findUnique({ where: { token: input.token } });
    if (existing && existing.userId !== userId) return { state: "ownership_conflict" as const };
    if (!existing && await tx.notificationDevice.count({ where: { userId, revokedAt: null } }) >= 10) return { state: "device_limit" as const };
    const device = existing
      ? await tx.notificationDevice.update({ where: { id: existing.id }, data: { consentAt: existing.revokedAt ? now : existing.consentAt, revokedAt: null } })
      : await tx.notificationDevice.create({ data: { userId, token: input.token, platform: input.platform, provider: "expo", consentAt: now } });
    const consent = await tx.notificationConsent.findUnique({ where: { userId } });
    if (!consent?.pushConsentAt || (consent.pushRevokedAt && consent.pushRevokedAt >= consent.pushConsentAt)) {
      await tx.notificationConsent.upsert({ where: { userId }, create: { userId, pushConsentAt: now }, update: { pushConsentAt: now } });
    }
    return { state: "registered" as const, deviceId: device.id };
  });
}
