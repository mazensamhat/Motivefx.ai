import { useCallback, useEffect, useState } from "react";
import { Building2, Copy, KeyRound, Plus, Users } from "lucide-react";
import { apiGet, apiPost, apiDelete } from "../lib/api";
import { useModules } from "../hooks/useModules";

type Dashboard = {
  team: { id: string; name: string; ownerId: string } | null;
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
  const canTeam = hasFeature("team_workspace");
  const canApi = hasFeature("api_access");

  if (!canTeam && !canApi) {
    return (
      <section className="home-section phase2-card institutional-locked">
        <div className="home-section-header">
          <h2>
            <Building2 size={18} /> Institutional
          </h2>
          <span className="home-section-sub">Ultra+ / Elite</span>
        </div>
        <p className="phase2-muted">
          Team workspaces, shared research notes, API keys, and custom scenario templates unlock on
          Ultra+ (no plan rename — same Lite→Elite ladder).
        </p>
      </section>
    );
  }

  return (
    <div className="institutional-panel">
      {canTeam && <TeamWorkspaceSection />}
      {canApi && <ApiKeysSection />}
    </div>
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

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ dashboard: Dashboard }>("/institutional/workspace");
      setDash(res.dashboard);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load workspace");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTeam() {
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
    if (!inviteEmail.trim()) return;
    setBusy(true);
    try {
      await apiPost("/institutional/workspace", {
        action: "invite",
        email: inviteEmail.trim(),
        role: "analyst",
      });
      setInviteEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setBusy(false);
    }
  }

  async function addNote() {
    if (!noteTitle.trim() || !noteBody.trim()) return;
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
    if (!tplLabel.trim() || !tplSeed.trim()) return;
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
      {!dash?.team ? (
        <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void createTeam()}>
          Create workspace
        </button>
      ) : (
        <>
          <p className="phase2-seed">{dash.team.name}</p>
          <div className="phase2-sim-row">
            <label className="phase2-field">
              <span>Invite analyst (email)</span>
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@firm.com"
              />
            </label>
            <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void invite()}>
              <Plus size={14} /> Invite
            </button>
          </div>
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
            <input value={noteTitle} onChange={(e) => setNoteTitle(e.target.value)} />
          </label>
          <label className="phase2-field">
            <span>Note</span>
            <input value={noteBody} onChange={(e) => setNoteBody(e.target.value)} placeholder="Shared thesis…" />
          </label>
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void addNote()}>
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
            <input value={tplLabel} onChange={(e) => setTplLabel(e.target.value)} />
          </label>
          <label className="phase2-field">
            <span>Seed event</span>
            <input value={tplSeed} onChange={(e) => setTplSeed(e.target.value)} placeholder="What if…" />
          </label>
          <button type="button" className="btn btn-sm btn-ghost" disabled={busy} onClick={() => void saveTemplate()}>
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
      )}
    </section>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
        <code>Authorization: Bearer mfx_…</code>
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
        {keys.map((k) => (
          <li key={k.id}>
            <div>
              <strong>{k.name}</strong>
              <span className="phase2-muted">
                {k.keyPrefix}… · created {new Date(k.createdAt).toLocaleDateString()}
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
