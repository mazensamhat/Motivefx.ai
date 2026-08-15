import { createHash, randomBytes } from "crypto";
import { prisma } from "@motivefx/database";
import type { User } from "@prisma/client";

export type TeamRole = "owner" | "admin" | "analyst" | "viewer";

export type ScenarioTemplate = {
  id: string;
  label: string;
  seedEvent: string;
  horizon: string;
  aggressiveness?: "conservative" | "base" | "aggressive";
  createdAt: string;
};

export type TeamPrefs = {
  scenarioTemplates: ScenarioTemplate[];
  customPriors: Array<{ themeId: string; probabilityBias: number }>;
};

export function emptyTeamPrefs(): TeamPrefs {
  return { scenarioTemplates: [], customPriors: [] };
}

export function parseTeamPrefs(raw: string | null | undefined): TeamPrefs {
  try {
    const o = JSON.parse(raw || "{}") as Partial<TeamPrefs>;
    return {
      scenarioTemplates: Array.isArray(o.scenarioTemplates) ? o.scenarioTemplates : [],
      customPriors: Array.isArray(o.customPriors) ? o.customPriors : [],
    };
  } catch {
    return emptyTeamPrefs();
  }
}

export async function getUserTeam(userId: string) {
  try {
    const membership = await prisma.teamMember.findFirst({
      where: { userId, status: "active" },
      include: { team: true },
      orderBy: { createdAt: "asc" },
    });
    if (membership) return membership.team;
    return prisma.team.findFirst({ where: { ownerId: userId }, orderBy: { createdAt: "asc" } });
  } catch {
    return null;
  }
}

export async function ensureTeamForOwner(user: User, name?: string) {
  const existing = await getUserTeam(user.id);
  if (existing) return existing;

  const team = await prisma.team.create({
    data: {
      name: name?.trim() || `${user.displayName ?? user.email.split("@")[0]}'s workspace`,
      ownerId: user.id,
      prefsJson: JSON.stringify(emptyTeamPrefs()),
      members: {
        create: {
          userId: user.id,
          role: "owner",
          status: "active",
        },
      },
    },
  });
  return team;
}

export async function listTeamMembers(teamId: string) {
  return prisma.teamMember.findMany({
    where: { teamId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, email: true, displayName: true } } },
  });
}

export async function inviteToTeam(opts: {
  teamId: string;
  email: string;
  role?: TeamRole;
}) {
  const email = opts.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Valid email required");

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const already = await prisma.teamMember.findFirst({
      where: { teamId: opts.teamId, userId: existingUser.id },
    });
    if (already) return already;
    return prisma.teamMember.create({
      data: {
        teamId: opts.teamId,
        userId: existingUser.id,
        role: opts.role ?? "analyst",
        status: "active",
      },
    });
  }

  const pending = await prisma.teamMember.findFirst({
    where: { teamId: opts.teamId, invitedEmail: email, status: "pending" },
  });
  if (pending) return pending;

  return prisma.teamMember.create({
    data: {
      teamId: opts.teamId,
      invitedEmail: email,
      role: opts.role ?? "analyst",
      status: "pending",
    },
  });
}

/** Claim pending invites when user signs in / opens workspace. */
export async function claimPendingInvites(user: User) {
  try {
    const email = user.email.toLowerCase();
    const pending = await prisma.teamMember.findMany({
      where: { invitedEmail: email, status: "pending" },
    });
    for (const row of pending) {
      await prisma.teamMember.update({
        where: { id: row.id },
        data: { userId: user.id, status: "active", invitedEmail: email },
      });
    }
    return pending.length;
  } catch {
    return 0;
  }
}

export async function listTeamNotes(teamId: string, limit = 40) {
  return prisma.teamNote.findMany({
    where: { teamId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { author: { select: { id: true, email: true, displayName: true } } },
  });
}

export async function createTeamNote(opts: {
  teamId: string;
  authorId: string;
  title: string;
  body: string;
  themeId?: string;
  symbol?: string;
}) {
  return prisma.teamNote.create({
    data: {
      teamId: opts.teamId,
      authorId: opts.authorId,
      title: opts.title.trim().slice(0, 160),
      body: opts.body.trim().slice(0, 8000),
      themeId: opts.themeId ?? null,
      symbol: opts.symbol ?? null,
    },
  });
}

export async function updateTeamPrefs(teamId: string, prefs: TeamPrefs) {
  return prisma.team.update({
    where: { id: teamId },
    data: { prefsJson: JSON.stringify(prefs) },
  });
}

function hashKey(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function generateApiKeySecret(): { raw: string; prefix: string; hash: string } {
  const raw = `mfx_${randomBytes(24).toString("hex")}`;
  const prefix = raw.slice(0, 12);
  return { raw, prefix, hash: hashKey(raw) };
}

/** Soft cap so desks don't accumulate unbounded secrets. */
export const MAX_API_KEYS_PER_USER = 10;

export async function createApiKey(opts: {
  userId: string;
  teamId?: string | null;
  name: string;
}) {
  const active = await prisma.apiKey.count({
    where: { userId: opts.userId, revokedAt: null },
  });
  if (active >= MAX_API_KEYS_PER_USER) {
    throw new Error(
      `Maximum of ${MAX_API_KEYS_PER_USER} active API keys reached. Revoke an unused key first.`
    );
  }
  const { raw, prefix, hash } = generateApiKeySecret();
  const row = await prisma.apiKey.create({
    data: {
      userId: opts.userId,
      teamId: opts.teamId ?? null,
      name: opts.name.trim().slice(0, 80) || "Default",
      keyPrefix: prefix,
      keyHash: hash,
    },
  });
  return { key: row, secret: raw };
}

export async function listApiKeys(userId: string) {
  return prisma.apiKey.findMany({
    where: { userId, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      teamId: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });
}

export async function revokeApiKey(userId: string, keyId: string) {
  const result = await prisma.apiKey.updateMany({
    where: { id: keyId, userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  return result.count > 0;
}

export async function resolveApiKeyBearer(authHeader: string | null) {
  if (!authHeader?.toLowerCase().startsWith("bearer ")) return null;
  const raw = authHeader.slice(7).trim();
  if (!raw.startsWith("mfx_")) return null;
  const prefix = raw.slice(0, 12);
  const hash = hashKey(raw);
  try {
    const row = await prisma.apiKey.findFirst({
      where: { keyPrefix: prefix, keyHash: hash, revokedAt: null },
      include: { user: true },
    });
    if (!row) return null;
    void prisma.apiKey
      .update({ where: { id: row.id }, data: { lastUsedAt: new Date() } })
      .catch(() => undefined);
    return row;
  } catch {
    return null;
  }
}

export async function buildInstitutionalDashboard(userId: string) {
  const team = await getUserTeam(userId);
  if (!team) {
    return {
      team: null,
      members: [],
      notes: [],
      prefs: emptyTeamPrefs(),
      apiKeyCount: 0,
    };
  }
  const [members, notes, apiKeyCount] = await Promise.all([
    listTeamMembers(team.id),
    listTeamNotes(team.id, 12),
    prisma.apiKey.count({ where: { userId, revokedAt: null } }),
  ]);
  return {
    team: { id: team.id, name: team.name, ownerId: team.ownerId, createdAt: team.createdAt },
    members: members.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      email: m.user?.email ?? m.invitedEmail,
      displayName: m.user?.displayName ?? null,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      themeId: n.themeId,
      symbol: n.symbol,
      author: n.author.displayName ?? n.author.email,
      createdAt: n.createdAt,
    })),
    prefs: parseTeamPrefs(team.prefsJson),
    apiKeyCount,
  };
}
