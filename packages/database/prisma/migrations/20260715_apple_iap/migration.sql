-- Apple IAP / RevenueCat fields on User
-- Run via: pnpm --filter @motivefx/database exec prisma db push
-- or apply manually against Postgres.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingProvider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleOriginalTransactionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleProductId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "revenueCatAppUserId" TEXT;

CREATE INDEX IF NOT EXISTS "User_appleOriginalTransactionId_idx" ON "User"("appleOriginalTransactionId");
CREATE INDEX IF NOT EXISTS "User_revenueCatAppUserId_idx" ON "User"("revenueCatAppUserId");
