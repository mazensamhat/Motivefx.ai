import { prisma } from "@motivefx/database";

export type IntelAlert = {
  id: string;
  module: string | null;
  symbol: string | null;
  title: string;
  body: string | null;
  confidence: number | null;
  alert_key: string;
  seen: boolean;
  created_at: string;
};

function toAlert(a: {
  id: string;
  module: string | null;
  symbol: string | null;
  title: string;
  body: string | null;
  confidence: number | null;
  alertKey: string;
  seen: boolean;
  createdAt: Date;
}): IntelAlert {
  return {
    id: a.id,
    module: a.module,
    symbol: a.symbol,
    title: a.title,
    body: a.body,
    confidence: a.confidence,
    alert_key: a.alertKey,
    seen: a.seen,
    created_at: a.createdAt.toISOString(),
  };
}

export async function listAlerts(userId: string): Promise<IntelAlert[]> {
  const rows = await prisma.intelAlert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAlert);
}

export async function upsertAlerts(
  userId: string,
  alerts: Array<{
    module?: string;
    symbol?: string;
    title: string;
    body?: string;
    confidence?: number;
    alertKey: string;
  }>
) {
  for (const alert of alerts) {
    await prisma.intelAlert.upsert({
      where: { userId_alertKey: { userId, alertKey: alert.alertKey } },
      create: {
        userId,
        module: alert.module ?? null,
        symbol: alert.symbol ?? null,
        title: alert.title,
        body: alert.body ?? null,
        confidence: alert.confidence ?? null,
        alertKey: alert.alertKey,
      },
      update: {
        title: alert.title,
        body: alert.body ?? null,
        confidence: alert.confidence ?? null,
      },
    });
  }
}

export async function markAlertSeen(userId: string, alertId: string) {
  const result = await prisma.intelAlert.updateMany({
    where: { id: alertId, userId },
    data: { seen: true },
  });
  return result.count > 0;
}

export async function markAllAlertsSeen(userId: string) {
  await prisma.intelAlert.updateMany({ where: { userId }, data: { seen: true } });
}

export function unreadCount(alerts: IntelAlert[]) {
  return alerts.filter((a) => !a.seen).length;
}
