import { useEffect, useRef, useState } from "react";
import type { TabId } from "../../types";
import { ChiefOfFinanceFab } from "./ChiefOfFinanceFab";
import { ChiefOfFinancePanel } from "./ChiefOfFinancePanel";

interface Props { activeTab: TabId; onNavigate: (tab: TabId) => void; }
export function ChiefOfFinanceAssistant({ activeTab, onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<{ id: number; text: string } | null>(null);
  const promptId = useRef(0);
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ prompt?: unknown }>).detail;
      if (typeof detail?.prompt === "string" && detail.prompt.trim()) {
        setInitialPrompt({ id: ++promptId.current, text: detail.prompt.trim().slice(0, 4000) });
      }
      setOpen(true);
    };
    window.addEventListener("motivefx:ask-open", onOpen);
    return () => window.removeEventListener("motivefx:ask-open", onOpen);
  }, []);
  return <>
    <ChiefOfFinanceFab onClick={() => setOpen(true)} />
    <ChiefOfFinancePanel open={open} onClose={() => setOpen(false)} activeTab={activeTab}
      initialPrompt={initialPrompt} onNavigate={(tab) => { onNavigate(tab); setOpen(false); }} />
  </>;
}
