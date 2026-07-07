import { createHash } from "crypto";
import { prisma } from "@motivefx/database";
import { updateBetSettlement } from "./bets";
import { updatePredictionSettlement } from "./predictions";

const START_BANKROLL = 1000;
const SIM_EDGE_BOOST = 0.08;

function deterministicRoll(seed: string): number {
  const digest = createHash("sha256").update(seed).digest("hex");
  return parseInt(digest.slice(0, 8), 16) / 0xffffffff;
}

function parseAmericanOdds(odds: string): number | null {
  const cleaned = (odds || "").trim().replace(/[^\d+\-]/g, "");
  if (!cleaned || cleaned === "+" || cleaned === "-") return null;
  const n = parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

function impliedWinProb(odds: string): number {
  const parsed = parseAmericanOdds(odds);
  if (parsed === null) return 0.52;
  if (parsed > 0) return 100 / (parsed + 100);
  return Math.abs(parsed) / (Math.abs(parsed) + 100);
}

function betProfit(stake: number, odds: string, won: boolean): number {
  if (!won) return -stake;
  const parsed = parseAmericanOdds(odds);
  if (parsed === null) return stake * 0.91;
  if (parsed > 0) return (stake * parsed) / 100;
  return (stake * 100) / Math.abs(parsed);
}

async function adjustBankroll(userId: string, delta: number): Promise<number> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { simBankroll: { increment: delta } },
    select: { simBankroll: true },
  });
  return Math.round((user.simBankroll ?? START_BANKROLL) * 100) / 100;
}

export async function settleSimulationBet(
  betId: string,
  userId: string,
  matchup: string,
  pick: string,
  odds: string,
  stake: number
) {
  const s = stake || 25;
  const roll = deterministicRoll(`bet:${betId}:${userId}:${matchup}:${pick}`);
  const winProb = Math.min(0.92, impliedWinProb(odds) + SIM_EDGE_BOOST);
  const won = roll < winProb;
  const pnl = Math.round(betProfit(s, odds, won) * 100) / 100;
  const outcome = won ? "won" : "lost";
  const settledAt = new Date();
  await updateBetSettlement(betId, outcome, pnl, settledAt);
  const bankroll = await adjustBankroll(userId, pnl);
  return { outcome, pnl, won, settledAt: settledAt.toISOString(), bankroll };
}

export async function settleSimulationPrediction(
  positionId: string,
  userId: string,
  market: string,
  pick: string,
  stake: number,
  yesPrice: number
) {
  const s = stake || 25;
  let yp = yesPrice || 0.5;
  yp = Math.max(0.05, Math.min(0.95, yp));
  const roll = deterministicRoll(`pred:${positionId}:${userId}:${market}:${pick}`);
  const pickLower = pick.toLowerCase();
  let won: boolean;
  let pnl: number;
  if (pickLower === "yes") {
    const winProb = Math.min(0.92, yp + SIM_EDGE_BOOST);
    won = roll < winProb;
    pnl = won ? Math.round(((s * (1 - yp)) / yp) * 100) / 100 : Math.round(-s * 100) / 100;
  } else {
    const noPrice = 1 - yp;
    const winProb = Math.min(0.92, noPrice + SIM_EDGE_BOOST);
    won = roll < winProb;
    pnl = won ? Math.round(((s * yp) / noPrice) * 100) / 100 : Math.round(-s * 100) / 100;
  }
  const outcome = won ? "won" : "lost";
  const settledAt = new Date();
  await updatePredictionSettlement(positionId, outcome, pnl, settledAt);
  const bankroll = await adjustBankroll(userId, pnl);
  return { outcome, pnl, won, settledAt: settledAt.toISOString(), bankroll };
}
