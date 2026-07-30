import { badRequest, json } from "@/lib/api";
import { requireTerminalSession, accessErrorResponse } from "@/lib/terminal/auth";
import { planForUser } from "@/lib/terminal/plan";
import { requireFeature } from "@/lib/terminal/access";
import {
  buildInstitutionalDashboard,
  claimPendingInvites,
  createTeamNote,
  ensureTeamForOwner,
  inviteToTeam,
  listTeamNotes,
  parseTeamPrefs,
  updateTeamPrefs,
  type ScenarioTemplate,
  type TeamPrefs,
} from "@/lib/terminal/institutional";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = planForUser(auth.session.user);
    requireFeature(plan, "team_workspace");
    await claimPendingInvites(auth.session.user);
    const dashboard = await buildInstitutionalDashboard(auth.session.user.id);
    return json({ dashboard, plan: { tier: plan.tier } });
  } catch (err) {
    return accessErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const auth = await requireTerminalSession();
  if (!auth.ok) return auth.response;
  try {
    const plan = planForUser(auth.session.user);
    requireFeature(plan, "team_workspace");
    let body: {
      action?: string;
      name?: string;
      email?: string;
      role?: "admin" | "analyst" | "viewer";
      title?: string;
      noteBody?: string;
      themeId?: string;
      symbol?: string;
      template?: ScenarioTemplate;
      prefs?: TeamPrefs;
    } = {};
    try {
      body = (await request.json()) as typeof body;
    } catch {
      return badRequest("JSON body required");
    }

    const action = body.action ?? "create_team";

    if (action === "create_team") {
      const team = await ensureTeamForOwner(auth.session.user, body.name);
      return json({ team: { id: team.id, name: team.name } });
    }

    if (action === "invite") {
      const team = await ensureTeamForOwner(auth.session.user);
      if (!body.email) return badRequest("email required");
      const member = await inviteToTeam({
        teamId: team.id,
        email: body.email,
        role: body.role ?? "analyst",
      });
      return json({
        member: {
          id: member.id,
          status: member.status,
          email: member.invitedEmail ?? body.email,
          role: member.role,
        },
      });
    }

    if (action === "add_note") {
      const team = await ensureTeamForOwner(auth.session.user);
      if (!body.title?.trim() || !body.noteBody?.trim()) {
        return badRequest("title and noteBody required");
      }
      const note = await createTeamNote({
        teamId: team.id,
        authorId: auth.session.user.id,
        title: body.title,
        body: body.noteBody,
        themeId: body.themeId,
        symbol: body.symbol,
      });
      return json({ note });
    }

    if (action === "save_template") {
      const team = await ensureTeamForOwner(auth.session.user);
      const prefs = parseTeamPrefs(team.prefsJson);
      const tpl = body.template;
      if (!tpl?.label || !tpl.seedEvent) return badRequest("template.label and seedEvent required");
      const next: ScenarioTemplate = {
        id: tpl.id || `tpl_${Date.now()}`,
        label: tpl.label.slice(0, 80),
        seedEvent: tpl.seedEvent.slice(0, 240),
        horizon: tpl.horizon || "30–90 days",
        aggressiveness: tpl.aggressiveness ?? "base",
        createdAt: new Date().toISOString(),
      };
      prefs.scenarioTemplates = [next, ...prefs.scenarioTemplates.filter((t) => t.id !== next.id)].slice(
        0,
        20
      );
      await updateTeamPrefs(team.id, prefs);
      return json({ prefs });
    }

    if (action === "save_prefs" && body.prefs) {
      const team = await ensureTeamForOwner(auth.session.user);
      await updateTeamPrefs(team.id, body.prefs);
      return json({ prefs: body.prefs });
    }

    if (action === "list_notes") {
      const team = await ensureTeamForOwner(auth.session.user);
      const notes = await listTeamNotes(team.id);
      return json({ notes });
    }

    return badRequest("Unknown action");
  } catch (err) {
    return accessErrorResponse(err);
  }
}
