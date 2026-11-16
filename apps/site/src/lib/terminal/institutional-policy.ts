import { z } from "zod";

export type TeamRole = "owner" | "admin" | "analyst" | "viewer";
export type WorkspaceCapability = "read" | "invite" | "research" | "preferences";

export class WorkspaceAccessError extends Error {
  constructor(message = "You do not have permission for this workspace action.") {
    super(message);
    this.name = "WorkspaceAccessError";
  }
}

/** Ownership is a Team relationship, never a client-supplied membership label. */
export function workspaceRole(ownerId: string, userId: string, role?: string): TeamRole | null {
  if (ownerId === userId) return "owner";
  return role === "admin" || role === "analyst" || role === "viewer" ? role : null;
}

export function workspacePermissions(role: TeamRole | null) {
  return {
    read: role !== null,
    invite: role === "owner" || role === "admin",
    inviteAdmin: role === "owner",
    research: role === "owner" || role === "admin" || role === "analyst",
    preferences: role === "owner" || role === "admin",
  };
}

const text = (max: number) => z.string().trim().min(1).max(max);
const template = z.object({
  id: text(100).optional(),
  label: text(80),
  seedEvent: text(240),
  horizon: text(100).optional(),
  aggressiveness: z.enum(["conservative", "base", "aggressive"]).optional(),
  createdAt: z.string().datetime().optional(),
}).strict();
const storedTemplate = template.extend({ id: text(100), horizon: text(100), createdAt: z.string().datetime() });
const prefs = z.object({
  scenarioTemplates: z.array(storedTemplate).max(20),
  customPriors: z.array(z.object({ themeId: text(100), probabilityBias: z.number().finite() }).strict()).max(100),
}).strict();

/** No caller-provided team, owner, author or membership identifiers are accepted. */
export const workspaceActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_team"), name: text(100).optional() }).strict(),
  z.object({ action: z.literal("invite"), email: z.string().trim().email().max(254), role: z.enum(["admin", "analyst", "viewer"]).default("analyst") }).strict(),
  z.object({ action: z.literal("add_note"), title: text(160), noteBody: text(8000), themeId: text(100).optional(), symbol: text(100).optional() }).strict(),
  z.object({ action: z.literal("save_template"), template }).strict(),
  z.object({ action: z.literal("save_prefs"), prefs }).strict(),
  z.object({ action: z.literal("list_notes") }).strict(),
]);

export type WorkspaceAction = z.infer<typeof workspaceActionSchema>;
