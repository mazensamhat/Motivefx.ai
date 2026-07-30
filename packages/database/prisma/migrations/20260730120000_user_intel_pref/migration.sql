-- Phase 3: predictive intelligence prefs (theme watchlists + alert rules)
CREATE TABLE IF NOT EXISTS "UserIntelPref" (
  "userId" TEXT NOT NULL,
  "prefsJson" TEXT NOT NULL DEFAULT '{}',
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserIntelPref_pkey" PRIMARY KEY ("userId")
);

DO $$ BEGIN
  ALTER TABLE "UserIntelPref"
    ADD CONSTRAINT "UserIntelPref_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
