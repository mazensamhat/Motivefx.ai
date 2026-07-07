import { prisma } from "@motivefx/database";

export type BetRow = {
  id: string;
  matchup: string;
  pick: string;
  odds: string | null;
  stake: number | null;
  sport: string;
  status: string;
  is_simulation: boolean;
  outcome: string | null;
  pnl: number | null;
  settled_at: string | null;
  created_at: string;
};

function toBetRow(b: {
  id: string;
  matchup: string;
  pick: string;
  odds: string | null;
  stake: number | null;
  sport: string;
  status: string;
  isSimulation: boolean;
  outcome: string | null;
  pnl: number | null;
  settledAt: Date | null;
  createdAt: Date;
}): BetRow {
  return {
    id: b.id,
    matchup: b.matchup,
    pick: b.pick,
    odds: b.odds,
    stake: b.stake,
    sport: b.sport,
    status: b.status,
    is_simulation: b.isSimulation,
    outcome: b.outcome,
    pnl: b.pnl,
    settled_at: b.settledAt?.toISOString() ?? null,
    created_at: b.createdAt.toISOString(),
  };
}

export async function listBets(userId: string): Promise<BetRow[]> {
  const rows = await prisma.userBet.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toBetRow);
}

export async function addBet(
  userId: string,
  data: {
    matchup: string;
    pick: string;
    odds?: string;
    stake?: number;
    sport?: string;
    isSimulation?: boolean;
  }
): Promise<string> {
  const row = await prisma.userBet.create({
    data: {
      userId,
      matchup: data.matchup,
      pick: data.pick,
      odds: data.odds ?? null,
      stake: data.stake ?? null,
      sport: data.sport ?? "other",
      isSimulation: Boolean(data.isSimulation),
    },
  });
  return row.id;
}

export async function updateBetSettlement(
  betId: string,
  outcome: string,
  pnl: number,
  settledAt: Date
) {
  await prisma.userBet.update({
    where: { id: betId },
    data: { outcome, pnl, settledAt, status: "settled" },
  });
}

export async function countBets(userId: string): Promise<number> {
  return prisma.userBet.count({ where: { userId } });
}
