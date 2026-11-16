import { badRequest, forbidden, json, serverError } from "@/lib/api";
import { requireTerminalSession, accessErrorResponse, FeatureLockedError } from "@/lib/terminal/auth";
import { entitlementsPlanForUser } from "@/lib/terminal/ios-reader";
import { requireFeature } from "@/lib/terminal/access";
import { sendTeamInviteEmail } from "@/lib/email";
import { WorkspaceAccessError, workspaceActionSchema } from "@/lib/terminal/institutional-policy";
import {
  buildInstitutionalDashboard,
  claimPendingInvites,
  createTeamNote,
  ensureTeamForOwner,
  inviteToTeam,
  listTeamNotes,
  parseTeamPrefs,
  updateTeamPrefs,
  withWorkspaceAccess,
  type ScenarioTemplate,
} from "@/lib/terminal/institutional";

export const dynamic = "force-dynamic";

function workspaceError(err: unknown) {
  if (err instanceof WorkspaceAccessError) return forbidden(err.message);
  if (err instanceof FeatureLockedError) return accessErrorResponse(err);
  return serverError("Workspace is unavailable. Please try again.");
}

export async function GET() {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "team_workspace");
    await claimPendingInvites(auth.session.user);
    const dashboard = await buildInstitutionalDashboard(auth.session.user.id);
    return json({ dashboard, plan: { tier: plan.tier } }, 200, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    return workspaceError(err);
  }
}

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return forbidden("Cross-origin update rejected");
  if (auth.session.impersonating) return forbidden("Workspace changes are unavailable while viewing another account.");
  try {
    const plan = await entitlementsPlanForUser(auth.session.user);
    requireFeature(plan, "team_workspace");
    let input: unknown;
    try {
      const raw = await request.text();
      if (raw.length > 32_768) return badRequest("Workspace request is too large");
      input = JSON.parse(raw);
    } catch {
      return badRequest("JSON body required");
    }
    const parsed = workspaceActionSchema.safeParse(input);
    if (!parsed.success) return badRequest("Invalid workspace action or fields");
    const body = parsed.data;
    const user = auth.session.user;

    if (body.action === "create_team") {
      const team = await ensureTeamForOwner(user, body.name);
      return json({ team: { id: team.id, name: team.name } });
    }

    if (body.action === "invite") {
      const { member, teamName } = await withWorkspaceAccess(user.id, "invite", async (db, access) => {
        if (body.role === "admin" && !access.permissions.inviteAdmin) throw new WorkspaceAccessError();
        const member = await inviteToTeam({ teamId: access.team.id, email: body.email, role: body.role }, db);
        return { member, teamName: access.team.name };
      });
      // An invitation email is attempted only after authorization and durable commit.
      const inviteEmail = (member.invitedEmail ?? body.email).trim().toLowerCase();
      const emailResult = await sendTeamInviteEmail({ to: inviteEmail, teamName, inviterEmail: user.email, role: member.role });
      return json({
        member: { id: member.id, status: member.status, email: inviteEmail, role: member.role },
        emailSent: emailResult.ok,
        emailError: emailResult.ok ? undefined : emailResult.error,
      });
    }

    if (body.action === "add_note") {
      const note = await withWorkspaceAccess(user.id, "research", (db, access) => createTeamNote({
        teamId: access.team.id, authorId: user.id, title: body.title, body: body.noteBody,
        themeId: body.themeId, symbol: body.symbol,
      }, db));
      return json({ note });
    }

    if (body.action === "save_template") {
      const prefs = await withWorkspaceAccess(user.id, "research", async (db, access) => {
        const prefs = parseTeamPrefs(access.team.prefsJson);
        const tpl = body.template;
        const next: ScenarioTemplate = {
          id: tpl.id || `tpl_${Date.now()}`,
          label: tpl.label,
          seedEvent: tpl.seedEvent,
          horizon: tpl.horizon || "30–90 days",
          aggressiveness: tpl.aggressiveness ?? "base",
          createdAt: new Date().toISOString(),
        };
        prefs.scenarioTemplates = [next, ...prefs.scenarioTemplates.filter(t => t.id !== next.id)].slice(0, 20);
        await updateTeamPrefs(access.team.id, prefs, db);
        return prefs;
      });
      return json({ prefs });
    }

    if (body.action === "save_prefs") {
      await withWorkspaceAccess(user.id, "preferences", (db, access) => updateTeamPrefs(access.team.id, body.prefs, db));
      return json({ prefs: body.prefs });
    }

    const notes = await withWorkspaceAccess(user.id, "read", (db, access) => listTeamNotes(access.team.id, 40, db));
    return json({ notes });
  } catch (err) {
    return workspaceError(err);
  }
}
