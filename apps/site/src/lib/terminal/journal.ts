import { prisma } from "@motivefx/database";

export type JournalEntry = {
  id: string;
  module: string | null;
  symbol: string | null;
  signal_title: string | null;
  note: string;
  created_at: string;
};

export async function listJournal(userId: string): Promise<JournalEntry[]> {
  const rows = await prisma.intelJournalEntry.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    module: r.module,
    symbol: r.symbol,
    signal_title: r.signalTitle,
    note: r.note,
    created_at: r.createdAt.toISOString(),
  }));
}

export async function addJournalEntry(
  userId: string,
  note: string,
  opts: { module?: string; symbol?: string; signalTitle?: string } = {}
) {
  const row = await prisma.intelJournalEntry.create({
    data: {
      userId,
      note,
      module: opts.module ?? null,
      symbol: opts.symbol ?? null,
      signalTitle: opts.signalTitle ?? null,
    },
  });
  return row.id;
}

export async function deleteJournalEntry(userId: string, entryId: string) {
  const result = await prisma.intelJournalEntry.deleteMany({
    where: { id: entryId, userId },
  });
  return result.count > 0;
}
