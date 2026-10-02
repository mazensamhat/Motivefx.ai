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
  home: ["What are today's top opportunities?", "Scan my whole portfolio", "Where do I add holdings?", "Explain this desk"],
  stocks: ["Analyze my Trades portfolio", "What are today's top opportunities?", "Explain unusual options flow", "Where do I add holdings?"],
  penny: ["Analyze my Pink Slips ledger", "What volume spikes look hot?", "Explain this desk", "Scan my whole portfolio"],
  crypto: ["Analyze my crypto ledger", "Any whale alerts today?", "Scan my whole portfolio", "Go to Home"],
  betting: ["Explain live odds on this desk", "What are today's top opportunities?", "Where do I track bets?", "Go to Home"],
  predictions: ["Explain event markets", "What are today's top opportunities?", "Analyze my prediction positions", "Go to Home"],
};
function subtitleForTab(tab: TabId) {
  const brand = MODULE_BRAND[TAB_TO_BRAND[tab]];
  switch (tab) {
    case "stocks": return "Ask about options flow, Motive Signal stances, or your Trades ledger.";
    case "penny": return "Ask about microcap volume spikes or your Pink Slips radar.";
    case "crypto": return "Ask about whale moves, on-chain context, or your crypto ledger.";
    case "betting": return "Ask about today's lines or how the Bets desk works. Odds context only.";
    case "predictions": return "Ask about event-market odds or your prediction positions.";
    default: return `${brand?.tagline ?? "Motive market intelligence."} Ask about signals, your book, or where to go next.`;
  }
}
interface Props {
  open: boolean; onClose: () => void; activeTab: TabId; onNavigate: (tab: TabId) => void;
  initialPrompt?: { id: number; text: string } | null;
}
export function ChiefOfFinancePanel({ open, onClose, activeTab, onNavigate, initialPrompt }: Props) {
  const { isAuthenticated, openAuth, user, error: authError, refreshUser } = useAuth();
  const { hasFeature, loading, error: accessError, refresh: refreshAccess } = useModules();
  const unlocked = hasFeature("ask_motive");
  const { messages, sending, error, followUps, degraded, send, retry, cancel, reset } = useChiefChat({ activeTab, onNavigate, userId: user?.userId });
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const consumedPrompt = useRef<number | null>(null);
  const previousUser = useRef(user?.userId);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (open && initialPrompt && consumedPrompt.current !== initialPrompt.id) {
      consumedPrompt.current = initialPrompt.id;
      setDraft(initialPrompt.text);
      inputRef.current?.focus();
    }
  }, [open, initialPrompt, loading, unlocked, isAuthenticated]);
  useEffect(() => {
    if (previousUser.current && previousUser.current !== user?.userId) setDraft("");
    previousUser.current = user?.userId;
  }, [user?.userId]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab") return;
      const nodes = panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), a[href], [tabindex="0"]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const focusTimer = setTimeout(() => (inputRef.current ?? panelRef.current?.querySelector<HTMLElement>("button"))?.focus(), 0);
    window.addEventListener("keydown", onKey);
    return () => { clearTimeout(focusTimer); window.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [open]);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending, open, followUps]);
  if (!open) return null;
  async function submit(text?: string) {
    const value = (text ?? draft).trim();
    if (!value || sending) return;
    if (text) setDraft(value);
    const ok = await send(value);
    if (ok) setDraft("");
  }
  const body = <div className="chief-overlay" role="presentation" onClick={onClose}>
    <aside ref={panelRef} className="chief-panel glass-panel chief-panel-enter" role="dialog" aria-modal="true" aria-labelledby="chief-title" onClick={(e) => e.stopPropagation()}>
      <header className="chief-header">
        <div className="chief-header-copy"><span className="chief-kicker"><Sparkles size={14} aria-hidden /> MotiveFX</span><h2 id="chief-title">Your A.I. Chief of Finance</h2><p className="chief-sub">{subtitleForTab(activeTab)}</p></div>
        <button type="button" className="btn-icon chief-close" onClick={onClose} aria-label="Close"><X size={18} /></button>
      </header>
      {(authError || accessError) && (!isAuthenticated || !unlocked) ? <div className="chief-locked" role="alert"><p>{authError || accessError}</p><p>Ask Motive cannot verify access yet. Your question is retained.</p><button type="button" className="btn" onClick={() => { if (authError) void refreshUser(); else void refreshAccess(); }}>Retry account check</button></div> : loading ? <div className="chief-locked" role="status">Checking your access…</div> : !isAuthenticated ? (
        <div className="chief-locked"><Lock size={22} /><p>{isNativeIosShell() ? "Sign in (optional) to sync your ledger with your Chief of Finance." : "Sign in to talk with your A.I. Chief of Finance."}</p><button type="button" className="btn btn-accent-terminal btn-sm" onClick={() => openAuth("login")}>{isNativeIosShell() ? "Sign in (optional)" : "Sign in"}</button></div>
      ) : !unlocked ? (
        <div className="chief-locked"><Lock size={22} />{isNativeIosShell() ? <p>Your A.I. Chief of Finance is part of this free informational reader. Market insights stay available without any purchase.</p>
          : <><p>Unlock <strong>A.I. Chief of Finance</strong> on {requiredTierLabel("ask_motive")} or higher with an active plan.</p>{isNativeShell() ? <p className="chief-locked-hint">Open Account → plans when store billing is available, or use an account that already includes this feature.</p> : <a className="btn btn-accent-terminal btn-sm" href="/pricing">View plans</a>}</>}</div>
      ) : <>
        <div className="chief-messages" ref={listRef} role="log" aria-label="Conversation" aria-live="polite">
          {!messages.length && <div className="chief-welcome"><p>Ask me to review your book, explain a ticker, surface today's signals, or help you navigate a desk.</p><div className="chief-chips">{SUGGESTIONS_BY_TAB[activeTab].map((s) => <button key={s} type="button" className="chief-chip" disabled={sending} onClick={() => void submit(s === "Explain this desk" ? `Explain the ${activeTab} desk` : s)}>{s}</button>)}</div></div>}
          {messages.map((m) => <div key={m.id} className={`chief-bubble chief-bubble-${m.role}`}>{m.content.split("\n").map((line, i) => <p key={`${m.id}-${i}`}>{formatInline(line)}</p>)}</div>)}
          {sending && <div className="chief-bubble chief-bubble-assistant chief-typing" role="status">Checking your question and available evidence…</div>}
          {!sending && followUps.length > 0 && <div className="chief-chips chief-followups">{followUps.map((s) => <button key={s} type="button" className="chief-chip" onClick={() => void submit(s)}>{s}</button>)}</div>}
        </div>
        {error && <div className="chief-recovery"><p className="chief-error" role="alert">{error}</p><button type="button" className="btn btn-ghost btn-sm" disabled={sending} onClick={() => { void retry().then((ok) => { if (ok) setDraft(""); }); }}>Retry question</button></div>}
        {degraded && <p className="chief-sub" role="status">Limited-service response. Only available data was used.</p>}
        <form className="chief-composer" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
          <input ref={inputRef} value={draft} maxLength={4000} onChange={(e) => setDraft(e.target.value)} placeholder="Ask your Chief of Finance…" disabled={sending} aria-label="Message" />
          {sending ? <button type="button" className="btn btn-ghost btn-sm" onClick={cancel}>Stop</button> : <button type="submit" className="btn btn-accent-terminal btn-sm" disabled={!draft.trim()} aria-label="Send message"><Send size={14} /></button>}
        </form>
        <div className="chief-footer"><button type="button" className="btn btn-ghost btn-sm" onClick={() => { reset(); setDraft(""); }} disabled={sending || !messages.length}>Clear</button><span>Informational only. Not financial advice.</span></div>
      </>}
    </aside>
  </div>;
  return createPortal(body, document.body);
}
function formatInline(line: string) { return line.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>); }
