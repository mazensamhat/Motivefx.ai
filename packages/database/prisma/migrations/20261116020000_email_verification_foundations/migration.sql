-- Staged only. Feature gates prevent access until explicitly activated.
CREATE TABLE "EmailVerification" (
  "userId" TEXT NOT NULL PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "emailHash" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE "EmailVerificationChallenge" (
  "tokenHash" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "emailHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "sendState" TEXT NOT NULL DEFAULT 'prepared'
);
CREATE INDEX "EmailVerificationChallenge_userId_purpose_createdAt_idx" ON "EmailVerificationChallenge"("userId", "purpose", "createdAt");
ALTER TABLE "EmailVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationChallenge" ENABLE ROW LEVEL SECURITY;
