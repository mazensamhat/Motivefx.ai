import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useModules } from "../../hooks/useModules";
import { requiredTierLabel } from "../../lib/entitlements";
import type { TabId } from "../../types";
import { useChiefChat } from "./useChiefChat";

const SUGGESTIONS = [
  "What are today's top opportunities?",
  "Analyze my portfolio",
  "Where do I add holdings?",
  "Explain this desk",
  "Go to Crypto",
];

interface Props {
  open: boolean;
  onClose: () => void;
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

export function ChiefOfFinancePanel({ open, onClose, activeTab, onNavigate }: Props) {
  const { isAuthenticated, openAuth } = useAuth();
  const { hasFeature, loading } = useModules();
  const unlocked = hasFeature("ask_motive");
  const { messages, sending, error, send, reset } = useChiefChat({ activeTab, onNavigate });
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending, open]);

  if (!open) return null;

  async function submit(text?: string) {
    const value = (text ?? draft).trim();
    if (!value) return;
    setDraft("");
    await send(value);
  }

  const body = (
    <div className="chief-overlay" role="presentation" onClick={onClose}>
      <aside
        className="chief-panel glass-panel"
        role="dialog"
        aria-modal
        aria-labelledby="chief-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="chief-header">
          <div className="chief-header-copy">
            <span className="chief-kicker">
              <Sparkles size={14} aria-hidden /> MotiveFX
            </span>
            <h2 id="chief-title">Your A.I. Chief of Finance</h2>
            <p className="chief-sub">Navigate desks, review signals, and ask about your ledger.</p>
          </div>
          <button type="button" className="btn-icon chief-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {loading ? (
          <div className="chief-locked">Loading access…</div>
        ) : !isAuthenticated ? (
          <div className="chief-locked">
            <Lock size={22} />
            <p>Sign in to talk with your A.I. Chief of Finance.</p>
            <button type="button" className="btn btn-accent-terminal btn-sm" onClick={() => openAuth("login")}>
              Sign in
            </button>
          </div>
        ) : !unlocked ? (
          <div className="chief-locked">
            <Lock size={22} />
            <p>
              Unlock <strong>A.I. Chief of Finance</strong> on {requiredTierLabel("ask_motive")} or higher
              with an active plan.
            </p>
            <a className="btn btn-accent-terminal btn-sm" href="/pricing">
              View plans
            </a>
          </div>
        ) : (
          <>
            <div className="chief-messages" ref={listRef}>
              {messages.length === 0 && (
                <div className="chief-welcome">
                  <p>
                    Ask me to explain a desk, analyze your portfolio, or surface today&apos;s opportunities.
                  </p>
                  <div className="chief-chips">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="chief-chip"
                        disabled={sending}
                        onClick={() => void submit(s === "Explain this desk" ? `Explain the ${activeTab} desk` : s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m) => (
                <div key={m.id} className={`chief-bubble chief-bubble-${m.role}`}>
                  {m.content.split("\n").map((line, i) => (
                    <p key={`${m.id}-${i}`}>{formatInline(line)}</p>
                  ))}
                </div>
              ))}
              {sending && <div className="chief-bubble chief-bubble-assistant chief-typing">Thinking…</div>}
            </div>

            {error && <p className="chief-error">{error}</p>}

            <form
              className="chief-composer"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask your Chief of Finance…"
                disabled={sending}
                aria-label="Message"
              />
              <button type="submit" className="btn btn-accent-terminal btn-sm" disabled={sending || !draft.trim()}>
                <Send size={14} />
              </button>
            </form>
            <div className="chief-footer">
              <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={sending || !messages.length}>
                Clear
              </button>
              <span>Informational only — not financial advice.</span>
            </div>
          </>
        )}
      </aside>
    </div>
  );

  return createPortal(body, document.body);
}

function formatInline(line: string) {
  // Lightweight **bold** rendering without pulling a markdown lib.
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
