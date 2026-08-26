import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Lock, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useModules } from "../../hooks/useModules";
import { requiredTierLabel } from "../../lib/entitlements";
import { isNativeIosShell, isNativeShell } from "../../lib/nativeShell";
import { TAB_TO_BRAND, MODULE_BRAND } from "../../brand/moduleBrand";
import type { TabId } from "../../types";
import { useChiefChat } from "./useChiefChat";

const SUGGESTIONS_BY_TAB: Record<TabId, string[]> = {
  home: [
    "What are today's top opportunities?",
    "Scan my whole portfolio",
    "Where do I add holdings?",
    "Explain this desk",
  ],
  stocks: [
    "Analyze my Trades portfolio",
    "What are today's top opportunities?",
    "Explain unusual options flow",
    "Where do I add holdings?",
  ],
  penny: [
    "Analyze my Pink Slips ledger",
    "What volume spikes look hot?",
    "Explain this desk",
    "Scan my whole portfolio",
  ],
  crypto: [
    "Analyze my crypto ledger",
    "Any whale alerts today?",
    "Scan my whole portfolio",
    "Go to Home",
  ],
  betting: [
    "Explain live odds on this desk",
    "What are today's top opportunities?",
    "Where do I track bets?",
    "Go to Home",
  ],
  predictions: [
    "Explain event markets",
    "What are today's top opportunities?",
    "Analyze my prediction positions",
    "Go to Home",
  ],
};

function subtitleForTab(tab: TabId): string {
  const brand = MODULE_BRAND[TAB_TO_BRAND[tab]];
  switch (tab) {
    case "stocks":
      return "Ask about options flow, Motive Signal stances, or your Trades ledger.";
    case "penny":
      return "Ask about microcap volume spikes or your Pink Slips radar.";
    case "crypto":
      return "Ask about whale moves, on-chain context, or your crypto ledger.";
    case "betting":
      return "Ask about today's lines or how the Bets desk works — odds context only.";
    case "predictions":
      return "Ask about event-market odds or your prediction positions.";
    default:
      return brand?.tagline
        ? `${brand.tagline} Ask about signals, your book, or where to go next.`
        : "Navigate desks, review signals, and ask about your ledger.";
  }
}

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
  const { messages, sending, error, followUps, send, reset } = useChiefChat({
    activeTab,
    onNavigate,
  });
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const suggestions = SUGGESTIONS_BY_TAB[activeTab] ?? SUGGESTIONS_BY_TAB.home;

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
  }, [messages, sending, open, followUps]);

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
        className="chief-panel glass-panel chief-panel-enter"
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
            <p className="chief-sub">{subtitleForTab(activeTab)}</p>
          </div>
          <button type="button" className="btn-icon chief-close" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </header>

        {loading ? (
          <div className="chief-locked">Loading…</div>
        ) : !isAuthenticated ? (
          <div className="chief-locked">
            <Lock size={22} />
            <p>
              {isNativeIosShell()
                ? "Sign in (optional) to save preferences and sync your ledger with your Chief of Finance."
                : "Sign in to talk with your A.I. Chief of Finance."}
            </p>
            <button type="button" className="btn btn-accent-terminal btn-sm" onClick={() => openAuth("login")}>
              {isNativeIosShell() ? "Sign in (optional)" : "Sign in"}
            </button>
          </div>
        ) : !unlocked ? (
          <div className="chief-locked">
            <Lock size={22} />
            {isNativeIosShell() ? (
              <p>
                Your A.I. Chief of Finance is part of this free informational reader. Market insights stay available
                without any purchase.
              </p>
            ) : (
              <>
                <p>
                  Unlock <strong>A.I. Chief of Finance</strong> on {requiredTierLabel("ask_motive")} or higher
                  with an active plan.
                </p>
                {isNativeShell() ? (
                  <p className="chief-locked-hint">
                    Open Account → plans in the terminal when store billing is available, or sign in with an
                    account that already includes this feature.
                  </p>
                ) : (
                  <a className="btn btn-accent-terminal btn-sm" href="/pricing">
                    View plans
                  </a>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="chief-messages" ref={listRef}>
              {messages.length === 0 && (
                <div className="chief-welcome">
                  <p>
                    I can scan your whole book, lens a ticker, surface today&apos;s signals, or walk you
                    through any desk.
                  </p>
                  <div className="chief-chips">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="chief-chip"
                        disabled={sending}
                        onClick={() =>
                          void submit(s === "Explain this desk" ? `Explain the ${activeTab} desk` : s)
                        }
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
              {!sending && followUps.length > 0 && (
                <div className="chief-chips chief-followups">
                  {followUps.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="chief-chip"
                      onClick={() => void submit(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
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
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
