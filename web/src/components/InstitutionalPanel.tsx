import { useCallback, useEffect, useState } from "react";
import { Building2, Copy, Headphones, KeyRound, Plus, Sparkles, Users } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { useModules } from "../hooks/useModules";
import { isNativeIosShell } from "../lib/nativeShell";
import type { PricingTierId } from "../config/pricingTiers";

/** Matches apps/site api-metering hourly caps for public intel API. */
function apiHourlyQuotaLabel(tier: PricingTierId): string {
  if (tier === "elite") return "Elite ≈ 2000 req/hr";
  return "Ultra+ ≈ 600 req/hr";
}

type Dashboard = {
  team: { id: string; name: string; ownerId: string } | null;
  role: "owner" | "admin" | "analyst" | "viewer" | null;
  permissions: { read: boolean; invite: boolean; inviteAdmin: boolean; research: boolean; preferences: boolean };
  members: Array<{
    id: string;
    role: string;
    status: string;
    email: string | null;
    displayName: string | null;
  }>;
  notes: Array<{
    id: string;
    title: string;
    body: string;
    author: string;
    symbol: string | null;
    createdAt: string;
  }>;
  prefs: {
    scenarioTemplates: Array<{
      id: string;
      label: string;
      seedEvent: string;
      horizon: string;
    }>;
  };
  apiKeyCount: number;
};

type ApiKeyRow = {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function InstitutionalPanel() {
  const { hasFeature } = useModules();
  // API keys are a paid web/Android digital feature — never expose create/manage on iOS free reader.
  const iosReader = isNativeIosShell();
  const canTeam = !iosReader && hasFeature("team_workspace");
  const canApi = !iosReader && hasFeature("api_access");
  const canConcierge = hasFeature("concierge_support");
  const canOnboarding = hasFeature("white_glove_onboarding");

  if (!canTeam && !canApi && !canConcierge) {
    return (
      <section className="home-section phase2-card institutional-locked">
        <div className="home-section-header">
          <h2>
            <Building2 size={18} /> Institutional
          </h2>
          <span className="home-section-sub">Ultra+ / Elite</span>
        </div>
        <p className="phase2-muted">
          {iosReader
            ? "Team workspaces and API keys are not available in this iOS reader app."
            : "Team workspaces, shared research notes, API keys, concierge support, and custom scenario templates unlock on Ultra+. Elite adds white-glove onboarding."}
        </p>
      </section>
    );
  }

  return (
    <div className="institutional-panel">
      {canTeam && <TeamWorkspaceSection />}
      {canApi && <ApiKeysSection />}
      {canConcierge && <ConciergeSection canOnboarding={canOnboarding} />}
    </div>
  );
}

function ConciergeSection({ canOnboarding }: { canOnboarding: boolean }) {
  const [kind, setKind] = useState<"concierge" | "onboarding">(
    canOnboarding ? "onboarding" : "concierge"
  );
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (message.trim().length < 12) {
      setStatus("Please describe what you need in a bit more detail.");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const res = await apiPost<{ message?: string }>("/concierge", {
        kind,
        message: message.trim(),
        pagePath: "/terminal",
      });
      setStatus(res.message ?? "Request received.");
      setMessage("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="home-section phase2-card">
      <div className="home-section-header">
        <h2>
          {canOnboarding ? <Sparkles size={18} /> : <Headphones size={18} />}{" "}
          {canOnboarding ? "VIP concierge & onboarding" : "Concierge support"}
        </h2>
        <span className="home-section-sub">
          {canOnboarding ? "Elite · 1 business day" : "Ultra+ · 1 business day"}
        </span>
      </div>
      <p className="phase2-muted">
        {canOnboarding
          ? "Book white-glove onboarding or reach priority concierge — we reply within one business day."
          : "Ask for workflow help, desk setup, or API guidance. Priority inbox for Ultra+."}
      </p>
      {canOnboarding && (
        <div className="phase2-sim-row" style={{ marginBottom: "0.65rem" }}>
          <label className="phase2-field">
            <span>Request type</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "concierge" | "onboarding")}
            >
              <option value="onboarding">White-glove onboarding</option>
              <option value="concierge">Concierge support</option>
            </select>
          </label>
        </div>
      )}
      <label className="phase2-field">
        <span>How can we help?</span>
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            kind === "onboarding"
              ? "Preferred times, markets you care about, team size…"
              : "Describe your desk workflow or API use case…"
          }
        />
      </label>
      <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void submit()}>
        Submit request
      </button>
      {status && (
        <p className="phase2-muted" style={{ marginTop: "0.5rem" }}>
          {status}
        </p>
      )}
    </section>
  );
}

function TeamWorkspaceSection() {
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [tplLabel, setTplLabel] = useState("");
  const [tplSeed, setTplSeed] = useState("");
  const [loading, setLoading] = useState(true);
  const canInvite = !loading && !error && dash?.permissions?.invite === true;
  const canResearch = !loading && !error && dash?.permissions?.research === true;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet<{ dashboard: Dashboard }>("/institutional/workspace");
      setDash(res.dashboard);
      setError(null);
    } catch (e) {
      setDash(null);
      setError(e instanceof Error ? e.message : "Unable to load workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTeam() {
    if (loading || error || !dash || dash.team) return;
    setBusy(true);
    try {
      await apiPost("/institutional/workspace", { action: "create_team" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function invite() {
    if (!canInvite || !inviteEmail.trim()) return;
    setBusy(true);
    try {
      const res = await apiPost<{ emailSent?: boolean; emailError?: string }>(
        "/institutional/workspace",
        {
          action: "invite",
          email: inviteEmail.trim(),
          role: "analyst",
        }
      );
      setInviteEmail("");
      await load();
      if (res.emailSent === false) {
        setError(
          res.emailError
            ? `Invite saved, but email failed: ${res.emailError}`
            : "Invite saved, but email could not be sent."
        );
      } else {
        setError(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!canResearch || !noteTitle.trim() || !noteBody.trim()) return;
    setBusy(true);
    try {
      await apiPost("/institutional/workspace", {
        action: "add_note",
        title: noteTitle,
        noteBody,
      });
      setNoteTitle("");
      setNoteBody("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Note failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveTemplate() {
    if (!canResearch || !tplLabel.trim() || !tplSeed.trim()) return;
    setBusy(true);
    try {
      await apiPost("/institutional/workspace", {
        action: "save_template",
        template: {
          id: `tpl_${Date.now()}`,
          label: tplLabel,
          seedEvent: tplSeed,
          horizon: "30–90 days",
          aggressiveness: "base",
          createdAt: new Date().toISOString(),
        },
      });
      setTplLabel("");
      setTplSeed("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Template failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="home-section phase2-card">
      <div className="home-section-header">
        <h2>
          <Users size={18} /> Team workspace
        </h2>
        <span className="home-section-sub">Shared notes · invites · scenario templates</span>
      </div>
      {error && <p className="phase2-muted">{error}</p>}
      {loading && <p className="phase2-muted">Loading workspace…</p>}
      {!loading && error && <button type="button" className="btn btn-sm btn-ghost" onClick={() => void load()}>Retry workspace</button>}
      {dash && !dash.team ? (
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy || loading || !!error} onClick={() => void createTeam()}>
          Create workspace
        </button>
      ) : dash?.team ? (
        <>
          <p className="phase2-seed">{dash.team.name}</p>
          <p className="phase2-muted">Your role: {dash.role ?? "unavailable"}. {!dash.permissions?.research && "You can read shared research."}</p>
          <div className="phase2-sim-row">
            <label className="phase2-field">
              <span>Invite analyst (email)</span>
              <input
                value={inviteEmail}
                disabled={busy || !canInvite}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@firm.com"
              />
            </label>
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy || !canInvite} onClick={() => void invite()}>
              <Plus size={14} /> Invite
            </button>
          </div>
          <p className="phase2-muted">{dash.permissions?.invite ? "Invites email a join link — they sign in with that address to activate." : "Workspace owners and admins manage invitations."}</p>
          <ul className="phase2-watch-list">
            {dash.members.map((m) => (
              <li key={m.id}>
                <div>
                  <strong>{m.displayName ?? m.email ?? "Member"}</strong>
                  <span className="phase2-muted">
                    {m.role} · {m.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="phase2-muted" style={{ marginTop: "0.85rem" }}>
            Research collaboration
          </p>
          <label className="phase2-field">
            <span>Note title</span>
            <input value={noteTitle} disabled={busy || !canResearch} onChange={(e) => setNoteTitle(e.target.value)} />
          </label>
          <label className="phase2-field">
            <span>Note</span>
            <input value={noteBody} disabled={busy || !canResearch} onChange={(e) => setNoteBody(e.target.value)} placeholder="Shared thesis…" />
          </label>
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy || !canResearch} onClick={() => void addNote()}>
            Add shared note
          </button>
          <ul className="phase2-watch-list" style={{ marginTop: "0.65rem" }}>
            {dash.notes.map((n) => (
              <li key={n.id}>
                <div>
                  <strong>{n.title}</strong>
                  <span className="phase2-muted">
                    {n.author}
                    {n.symbol ? ` · $${n.symbol}` : ""} — {n.body.slice(0, 120)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <p className="phase2-muted" style={{ marginTop: "0.85rem" }}>
            Custom scenario templates
          </p>
          <label className="phase2-field">
            <span>Template label</span>
            <input value={tplLabel} disabled={busy || !canResearch} onChange={(e) => setTplLabel(e.target.value)} />
          </label>
          <label className="phase2-field">
            <span>Seed event</span>
            <input value={tplSeed} disabled={busy || !canResearch} onChange={(e) => setTplSeed(e.target.value)} placeholder="What if…" />
          </label>
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy || !canResearch} onClick={() => void saveTemplate()}>
            Save template
          </button>
          <ul className="phase2-watch-list" style={{ marginTop: "0.65rem" }}>
            {(dash.prefs.scenarioTemplates ?? []).map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{t.label}</strong>
                  <span className="phase2-muted">
                    {t.horizon} — {t.seedEvent}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}

function ApiKeysSection() {
  const { tier } = useModules();
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const quotaLabel = apiHourlyQuotaLabel(tier);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ keys: ApiKeyRow[] }>("/institutional/keys");
      setKeys(res.keys);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load keys");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createKey() {
    setBusy(true);
    setSecret(null);
    setError(null);
    try {
      const res = await apiPost<{ secret: string }>("/institutional/keys", {
        name: `Key ${new Date().toLocaleDateString()}`,
      });
      setSecret(res.secret);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    setError(null);
    try {
      await apiDelete(`/institutional/keys?id=${encodeURIComponent(id)}`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Revoke failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="home-section phase2-card">
      <div className="home-section-header">
        <h2>
          <KeyRound size={18} /> API access
        </h2>
        <span className="home-section-sub">Bearer mfx_… · /api/v1/intel/*</span>
      </div>
      {error && <p className="phase2-muted">{error}</p>}
      <p className="phase2-muted">
        Example: <code>GET /api/v1/intel/briefing</code> with header{" "}
        <code>Authorization: Bearer mfx_…</code>.
      </p>
      <p className="phase2-muted">
        Your plan quota: <strong>{quotaLabel}</strong> (Ultra+ ≈ 600/hr · Elite ≈ 2000/hr). This is a
        usage cap, not an account block — exceeding it returns HTTP 429 until the hour window resets.
      </p>
      <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void createKey()}>
        <Plus size={14} /> Create API key
      </button>
      {secret && (
        <div className="institutional-secret">
          <strong>Copy now — shown once</strong>
          <code>{secret}</code>
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={() => void navigator.clipboard.writeText(secret)}
          >
            <Copy size={14} /> Copy
          </button>
        </div>
      )}
      <ul className="phase2-watch-list" style={{ marginTop: "0.75rem" }}>
        {keys.length === 0 && !error && (
          <li>
            <div>
              <span className="phase2-muted">No active keys yet — create one to call the intel API.</span>
            </div>
          </li>
        )}
        {keys.map((k) => (
          <li key={k.id}>
            <div>
              <strong>{k.name}</strong>
              <span className="phase2-muted">
                {k.keyPrefix}… · created {new Date(k.createdAt).toLocaleDateString()}
                {k.lastUsedAt ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}` : ""}
              </span>
            </div>
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void revoke(k.id)}>
              Revoke
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Thin wrapper kept for Home */
export function InstitutionalHomeSection() {
  return <InstitutionalPanel />;
}
