import { prisma } from "@motivefx/database";

export type PredictionRow = {
  id: string;
  market: string;
  category: string;
  pick: string;
  stake: number | null;
  yes_price: number | null;
  status: string;
  is_simulation: boolean;
  outcome: string | null;
  pnl: number | null;
  settled_at: string | null;
  created_at: string;
};

function toRow(p: {
  id: string;
  market: string;
  category: string;
  pick: string;
  stake: number | null;
  yesPrice: number | null;
  status: string;
  isSimulation: boolean;
  outcome: string | null;
  pnl: number | null;
  settledAt: Date | null;
  createdAt: Date;
}): PredictionRow {
  return {
    id: p.id,
    market: p.market,
    category: p.category,
    pick: p.pick,
    stake: p.stake,
    yes_price: p.yesPrice,
    status: p.status,
    is_simulation: p.isSimulation,
    outcome: p.outcome,
    pnl: p.pnl,
    settled_at: p.settledAt?.toISOString() ?? null,
    created_at: p.createdAt.toISOString(),
  };
}

export async function listPredictions(userId: string): Promise<PredictionRow[]> {
  const rows = await prisma.userPrediction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toRow);
}

export async function addPrediction(
  userId: string,
  data: {
    market: string;
    category?: string;
    pick: string;
    stake?: number;
    yesPrice?: number;
    isSimulation?: boolean;
  }
): Promise<string> {
  const row = await prisma.userPrediction.create({
    data: {
      userId,
      market: data.market,
      category: data.category ?? "other",
      pick: data.pick,
      stake: data.stake ?? null,
      yesPrice: data.yesPrice ?? null,
      isSimulation: Boolean(data.isSimulation),
    },
  });
  return row.id;
}

export async function updatePredictionSettlement(
  positionId: string,
  outcome: string,
  pnl: number,
  settledAt: Date
) {
  await prisma.userPrediction.update({
    where: { id: positionId },
    data: { outcome, pnl, settledAt, status: "settled" },
  });
}

export async function countPredictions(userId: string): Promise<number> {
  return prisma.userPrediction.count({ where: { userId } });
}
