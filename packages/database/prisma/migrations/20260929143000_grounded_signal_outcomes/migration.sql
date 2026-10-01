ALTER TABLE "SignalOutcome"
ADD COLUMN "entryPrice" DOUBLE PRECISION,
ADD COLUMN "outcomePrice" DOUBLE PRECISION,
ADD COLUMN "realizedReturnPct" DOUBLE PRECISION,
ADD COLUMN "evaluatorVersion" TEXT NOT NULL DEFAULT 'LEGACY_SIGNAL_V1';

CREATE INDEX "SignalOutcome_evaluatorVersion_outcome_idx"
ON "SignalOutcome"("evaluatorVersion", "outcome");
