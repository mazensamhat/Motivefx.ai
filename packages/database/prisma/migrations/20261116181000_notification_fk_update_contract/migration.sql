-- Staged additive-schema correction. The original notification foundation used
-- PostgreSQL's default NO ACTION on updates, while Prisma's relation contract
-- uses CASCADE. Preserve delete cascades and align all three user relations.
-- No production migration or user-ID rewrite is performed by the release.
ALTER TABLE "NotificationConsent"
  DROP CONSTRAINT "NotificationConsent_userId_fkey",
  ADD CONSTRAINT "NotificationConsent_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDevice"
  DROP CONSTRAINT "NotificationDevice_userId_fkey",
  ADD CONSTRAINT "NotificationDevice_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationDelivery"
  DROP CONSTRAINT "NotificationDelivery_userId_fkey",
  ADD CONSTRAINT "NotificationDelivery_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
