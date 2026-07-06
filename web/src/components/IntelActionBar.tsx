import { useState } from "react";
import { BookmarkPlus, Check, Copy, ExternalLink, Share2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useIntelJournal } from "../hooks/useIntelJournal";
import { useModules } from "../hooks/useModules";

interface Props {
  shareText: string;
  journalNote?: string;
  journalMeta?: { module?: string; symbol?: string; signalTitle?: string };
}

export function IntelActionBar({ shareText, journalNote, journalMeta }: Props) {
  const { isAuthenticated, openAuth } = useAuth();
  const { hasFeature } = useModules();
  const { addEntry } = useIntelJournal();
  const journalEnabled = hasFeature("decision_history");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  async function copyIntel() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  async function shareIntel() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "MotiveFX Signal Intel",
          text: shareText,
        });
        return;
      } catch {
        /* fall through */
      }
    }
    copyIntel();
  }

  async function saveToJournal() {
    if (!journalNote) return;
    if (!isAuthenticated) {
      openAuth("register");
      return;
    }
    setSaving(true);
    try {
      const ok = await addEntry(journalNote, journalMeta);
      if (ok) {
        setSaved(true);
      }
    } finally {
      setSaving(false);
    }
  }

  function viewJournal() {
    window.dispatchEvent(new CustomEvent("motivefx:journal-scroll"));
  }

  return (
    <div className="intel-action-bar">
      {journalNote && journalEnabled && (
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          onClick={() => void saveToJournal()}
          disabled={saving || saved}
        >
          {saved ? <Check size={14} /> : <BookmarkPlus size={14} />}
          {saved ? "Saved" : "Save to journal"}
        </button>
      )}
      {saved && (
        <button type="button" className="btn btn-sm btn-accent-terminal" onClick={viewJournal}>
          <ExternalLink size={14} /> View in journal
        </button>
      )}
      <button type="button" className="btn btn-sm btn-ghost" onClick={() => void copyIntel()}>
        <Copy size={14} />
        {copied ? "Copied" : "Copy"}
      </button>
      <button type="button" className="btn btn-sm btn-accent-terminal" onClick={() => void shareIntel()}>
        <Share2 size={14} />
        Share
      </button>
    </div>
  );
}
