import { Activity, BellRing, BookOpen, Bot, Briefcase, Clock3, History, Home, Lock, Radar, Search, Settings2, Sparkles, Users } from "lucide-react";
import { TAB_TO_BRAND } from "../brand/moduleBrand";
import { useGenerationalProfile } from "../hooks/useGenerationalProfile";
import { usePlatformPrefs } from "../hooks/usePlatformPrefs";
import { isNativeShell } from "../lib/nativeShell";
import { revealWorkspaceSection } from "../lib/workspaceNavigation";
import { MotiveFxBrandLogo, MotivFxLogo } from "./MotivFxLogo";
import type { TabId } from "../types";
const NAV: { id: TabId; label: string; module: string }[] = [
  { id: "stocks", label: "Stocks", module: "trades" }, { id: "penny", label: "Pink Sheets", module: "penny" },
  { id: "crypto", label: "Crypto", module: "crypto" }, { id: "betting", label: "Sports", module: "betting" },
  { id: "predictions", label: "Predictions", module: "predictions" },
];
interface Props { activeTab: TabId; onSelect: (tab: TabId) => void; hasModule: (module: string) => boolean; statusLabel: string; pulseBadges?: Record<string, number>; onOpenGlossary?: () => void; }
export function ModuleSidebar({ activeTab, onSelect, hasModule, statusLabel, pulseBadges = {}, onOpenGlossary }: Props) {
  const { openSetup } = usePlatformPrefs();
  const { profile, openSetup: openGenSetup } = useGenerationalProfile();
  function homeSection(id: string) {
    if (id === "v2-pro-intelligence") {
      localStorage.setItem("motivefx_pro_open", "1");
      window.dispatchEvent(new Event("motivefx:pro-open"));
    }
    onSelect("home");
    revealWorkspaceSection(`#${id}`);
  }
  return <aside className="module-sidebar glass-panel">
    <div className="sidebar-brand"><MotiveFxBrandLogo compact /><div className="sidebar-brand-name">MotiveFX<span>ONE AI. EVERY MARKET.</span></div></div>
    <nav className="sidebar-nav sidebar-v2-primary" aria-label="Motive intelligence">
      <button type="button" className={`sidebar-item ${activeTab === "home" ? "active" : ""}`} onClick={() => onSelect("home")} aria-current={activeTab === "home" ? "page" : undefined}><Home size={20} /><span>Home</span></button>
      <button type="button" className="sidebar-item" onClick={() => homeSection("v2-picks")}><Sparkles size={20} /><span>AI Picks</span></button>
      <button type="button" className="sidebar-item" onClick={() => homeSection("v2-signals")}><Activity size={20} /><span>Signals</span></button>
      <button type="button" className="sidebar-item" onClick={() => homeSection("opportunity-radar")}><Radar size={20} /><span>Opportunity Radar</span></button>
      <button type="button" className="sidebar-item" onClick={() => window.dispatchEvent(new CustomEvent("motivefx:ask-open"))}><Bot size={20} /><span>Ask Motive</span></button>
    </nav>
    <div className="sidebar-label">Explore markets</div>
    <nav className="sidebar-nav" aria-label="Market desks">{NAV.map((t) => {
      const active = activeTab === t.id;
      const pulse = pulseBadges[t.module] ?? 0;
      const label = isNativeShell() && t.id === "betting" ? "Odds intel" : isNativeShell() && t.id === "predictions" ? "Event intel" : t.label;
      return <button key={t.id} type="button" className={`sidebar-item ${active ? "active" : ""}`} data-brand={TAB_TO_BRAND[t.id]} onClick={() => onSelect(t.id)} aria-current={active ? "page" : undefined}>
        <MotivFxLogo module={TAB_TO_BRAND[t.id]} size={25} dimmed={!active} className="sidebar-item-logo" />
        <span className="sidebar-item-text">{label}{!hasModule(t.module) && <Lock size={11} />}{pulse > 0 && !active && <span className="sidebar-pulse-badge">{pulse} new</span>}</span>
      </button>;
    })}</nav>
    <div className="sidebar-label">Workspace</div>
    <nav className="sidebar-nav" aria-label="Workspace tools">
      <button type="button" className="sidebar-apps-btn" onClick={() => homeSection("v2-discover")}><Search size={15} />Discover / Scanner</button>
      <button type="button" className="sidebar-apps-btn" onClick={() => homeSection("v2-portfolio-intelligence")}><Briefcase size={15} />Portfolio Intelligence</button>
      <button type="button" className="sidebar-apps-btn" onClick={() => homeSection("v2-market-close")}><Clock3 size={15} />Market Close</button>
      <button type="button" className="sidebar-apps-btn" onClick={() => homeSection("v2-track-record")}><History size={15} />Track Record & Replay</button>
      <button type="button" className="sidebar-apps-btn" onClick={() => homeSection("v2-watch-agents")}><BellRing size={15} />Watch Agents</button>
      <button type="button" className="sidebar-apps-btn" onClick={() => homeSection("v2-pro-intelligence")}><Sparkles size={15} />Pro Intelligence</button>
      <button type="button" className="sidebar-apps-btn" onClick={openSetup}><Settings2 size={15} />{isNativeShell() ? "Research Apps" : "My Apps & Brokers"}</button>
      <button type="button" className="sidebar-apps-btn" onClick={onOpenGlossary}><BookOpen size={15} />Signal Glossary</button>
      <button type="button" className="sidebar-apps-btn" onClick={openGenSetup}><Users size={15} />{profile.name} Mode</button>
    </nav>
    <div className="sidebar-footer"><div className="sidebar-footer-profile"><div className="sidebar-avatar">M</div><div><p className="sidebar-profile-name">Motive workspace</p><p className="sidebar-profile-meta">{statusLabel}</p></div></div></div>
  </aside>;
}
