ALTER TABLE "UserBet" ADD COLUMN "sportsbook" TEXT;

CREATE INDEX "UserBet_userId_sportsbook_idx" ON "UserBet"("userId", "sportsbook");
