import { useEffect, useState } from "react";
import type { TabId } from "../../types";
import { ChiefOfFinanceFab } from "./ChiefOfFinanceFab";
import { ChiefOfFinancePanel } from "./ChiefOfFinancePanel";

interface Props {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}

export function ChiefOfFinanceAssistant({ activeTab, onNavigate }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("motivefx:ask-open", onOpen);
    return () => window.removeEventListener("motivefx:ask-open", onOpen);
  }, []);

  return (
    <>
      <ChiefOfFinanceFab onClick={() => setOpen(true)} />
      <ChiefOfFinancePanel
        open={open}
        onClose={() => setOpen(false)}
        activeTab={activeTab}
        onNavigate={(tab) => {
          onNavigate(tab);
          setOpen(false);
        }}
      />
    </>
  );
}
