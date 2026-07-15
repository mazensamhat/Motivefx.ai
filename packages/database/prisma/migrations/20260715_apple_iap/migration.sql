-- Apple IAP / RevenueCat fields on User
-- REQUIRED after deploying d05c4cb (App Store IAP). Without these columns,
-- Prisma User queries 500 and authenticated terminal/briefing/modules break.
--
-- Apply via (preferred):
--   pnpm --filter @motivefx/database exec prisma db push
-- Or run this SQL manually against production Postgres.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "billingProvider" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleOriginalTransactionId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "appleProductId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "revenueCatAppUserId" TEXT;

CREATE INDEX IF NOT EXISTS "User_appleOriginalTransactionId_idx" ON "User"("appleOriginalTransactionId");
CREATE INDEX IF NOT EXISTS "User_revenueCatAppUserId_idx" ON "User"("revenueCatAppUserId");
