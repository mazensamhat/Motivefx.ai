-- Additive only. Apply before activating notification storage. No existing
-- account, entitlement, consent, or historical outcome rows are modified.
CREATE TABLE "NotificationConsent" (
  "userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,
  "dailyEmailConsentAt" TIMESTAMP(3), "dailyEmailConfirmedAt" TIMESTAMP(3),
  "confirmedEmailHash" TEXT, "dailyEmailRevokedAt" TIMESTAMP(3),
  "emailSuppressedAt" TIMESTAMP(3), "pushConsentAt" TIMESTAMP(3), "pushRevokedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "NotificationDevice" (
  "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "provider" TEXT NOT NULL DEFAULT 'expo', "token" TEXT NOT NULL UNIQUE,
  "platform" TEXT NOT NULL, "consentAt" TIMESTAMP(3) NOT NULL, "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "NotificationDevice_userId_revokedAt_idx" ON "NotificationDevice"("userId", "revokedAt");
CREATE TABLE "NotificationDelivery" (
  "key" TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "channel" TEXT NOT NULL, "eventKey" TEXT NOT NULL, "targetRef" TEXT NOT NULL, "contentJson" TEXT NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'queued', "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL,
  "attemptedAt" TIMESTAMP(3), "providerId" TEXT, "lastCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "NotificationDelivery_state_availableAt_idx" ON "NotificationDelivery"("state", "availableAt");
CREATE INDEX "NotificationDelivery_userId_createdAt_idx" ON "NotificationDelivery"("userId", "createdAt");
CREATE INDEX "NotificationDelivery_channel_providerId_idx" ON "NotificationDelivery"("channel", "providerId");
CREATE TABLE "NotificationReceipt" (
  "id" TEXT PRIMARY KEY, "provider" TEXT NOT NULL, "eventType" TEXT NOT NULL,
  "providerId" TEXT NOT NULL, "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "NotificationReceipt_provider_providerId_idx" ON "NotificationReceipt"("provider", "providerId");
-- All access is through authenticated server routes and the server database role.
-- No anonymous/client policy is granted by this foundation migration.
ALTER TABLE "NotificationConsent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "NotificationReceipt" ENABLE ROW LEVEL SECURITY;
