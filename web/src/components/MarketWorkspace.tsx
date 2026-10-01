import { ArrowRight, BookOpen, Layers3, Search, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Desk = { title: string; eyebrow: string; description: string; questions: string[] };
const DESKS: Record<string, Desk> = {
  trades: { title: "Stocks", eyebrow: "EQUITY INTELLIGENCE", description: "Your holdings, market signals, and the evidence behind them.", questions: ["Explain today's stock signals", "Review my stock portfolio", "Explain unusual options flow"] },
  crypto: { title: "Crypto", eyebrow: "DIGITAL ASSET INTELLIGENCE", description: "Follow your assets, understand on-chain activity, and track what changes.", questions: ["Explain today's crypto signals", "Review my crypto portfolio", "Explain the latest whale activity"] },
  penny: { title: "Pink Sheets", eyebrow: "MICROCAP INTELLIGENCE", description: "Research smaller companies with liquidity and disclosure risk in view.", questions: ["Explain microcap liquidity risk", "Review my Pink Slips portfolio", "Explain today's volume spikes"] },
  betting: { title: "Sports", eyebrow: "ODDS INTELLIGENCE", description: "Compare sportsbook signals, understand line movement, and track your bets.", questions: ["Explain today's line movements", "Review my betting ledger", "Explain public versus sharp money"] },
  predictions: { title: "Predictions", eyebrow: "EVENT INTELLIGENCE", description: "Explore event markets and distinguish market prices from model forecasts.", questions: ["Explain event market probabilities", "Review my prediction positions", "What changed in prediction markets?"] },
};
export function MarketWorkspace({ module, children }: { module: string; children: ReactNode }) {
  const desk = DESKS[module] ?? DESKS.trades;
  const contentRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState("");
  const [sections, setSections] = useState<Array<{ id: string; title: string }>>([]);
  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;
    let frame = 0;
    const scan = () => {
      const next: Array<{ id: string; title: string }> = [];
      root.querySelectorAll<HTMLElement>(".card-title").forEach((heading, index) => {
        const panel = heading.closest<HTMLElement>(".card");
        if (!panel || panel.closest('[role="dialog"]')) return;
        const id = `desk-${module}-${index}`;
        panel.dataset.workspaceSection = "true";
        panel.id ||= id;
        const title = heading.textContent?.trim();
        if (title && !next.some((s) => s.id === panel.id)) next.push({ id: panel.id, title });
      });
      setSections((previous) => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    const observer = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(scan); });
    scan(); observer.observe(root, { childList: true, subtree: true });
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [module]);
  function ask(prompt: string) {
    window.dispatchEvent(new CustomEvent("motivefx:ask-open", { detail: { prompt } }));
  }
  function go(id: string) {
    const target = document.getElementById(id);
    target?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    target?.setAttribute("tabindex", "-1"); target?.focus({ preventScroll: true });
  }
  return <section className="market-workspace" data-workspace={module} aria-label={`${desk.title} workspace`}>
    <header className="market-workspace-hero">
      <div className="market-workspace-heading"><span className="v2-eyebrow">{desk.eyebrow}</span><h1>{desk.title}</h1><p>{desk.description}</p></div>
      <div className="market-workspace-research"><BookOpen size={16} /><span>Research & tracking<br /><strong>You make the decision.</strong></span></div>
      <form className="market-command" onSubmit={(event) => { event.preventDefault(); if (question.trim()) ask(question.trim()); }}>
        <Search size={18} aria-hidden="true" /><input aria-label={`Ask Motive about ${desk.title}`} value={question} maxLength={4000} onChange={(event) => setQuestion(event.target.value)} placeholder={`Ask Motive about ${desk.title.toLowerCase()}…`} />
        <button type="submit" disabled={!question.trim()} aria-label="Ask Motive"><ArrowRight size={18} /></button>
      </form>
      <div className="market-question-chips">{desk.questions.map((q) => <button key={q} type="button" onClick={() => ask(q)}><Sparkles size={13} />{q}</button>)}</div>
    </header>
    <nav className="market-section-nav" aria-label={`${desk.title} sections`}><span><Layers3 size={15} /> On this desk</span>{sections.map((s) => <button key={s.id} type="button" onClick={() => go(s.id)}>{s.title.replace(/ — .*/, "")}</button>)}</nav>
    <div className="market-workspace-content" ref={contentRef}>{children}</div>
  </section>;
}
