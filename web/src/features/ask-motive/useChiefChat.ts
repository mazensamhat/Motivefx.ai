import { useCallback, useState } from "react";
import type { TabId } from "../../types";

export type ChiefChatRole = "user" | "assistant";

export type ChiefChatMessage = {
  id: string;
  role: ChiefChatRole;
  content: string;
};

export type ChiefAction = { type: "navigate"; tab: TabId };

type AskResponse = {
  reply: string;
  actions?: ChiefAction[];
  usedTools?: string[];
  followUps?: string[];
  degraded?: boolean;
  disclaimer?: string;
  detail?: { message?: string; code?: string };
  error?: string;
};

function newId() {
  return `m_${Math.random().toString(36).slice(2, 10)}`;
}

export function useChiefChat(opts: {
  activeTab: TabId;
  onNavigate: (tab: TabId) => void;
}) {
  const { activeTab, onNavigate } = opts;
  const [messages, setMessages] = useState<ChiefChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);

  const send = useCallback(
    async (text: string) => {
      const content = text.trim();
      if (!content || sending) return;

      const userMsg: ChiefChatMessage = { id: newId(), role: "user", content };
      const nextMessages = [...messages, userMsg];
      setMessages(nextMessages);
      setSending(true);
      setError(null);
      setFollowUps([]);

      const tickerGuess = content.match(/\$([A-Za-z]{1,10})\b/)?.[1]?.toUpperCase();

      try {
        const res = await fetch("/api/ask-motive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({
            messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
            context: { tab: activeTab, symbol: tickerGuess },
          }),
        });
        const data = (await res.json().catch(() => ({}))) as AskResponse;
        if (!res.ok) {
          const detail =
            (typeof data.detail === "object" && data.detail?.message) ||
            data.error ||
            `Request failed (${res.status})`;
          throw new Error(String(detail));
        }

        setMessages((prev) => [
          ...prev,
          { id: newId(), role: "assistant", content: data.reply || "…" },
        ]);
        setFollowUps(data.followUps ?? []);

        for (const action of data.actions ?? []) {
          if (action.type === "navigate" && action.tab) {
            onNavigate(action.tab);
          }
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not reach Chief of Finance");
      } finally {
        setSending(false);
      }
    },
    [messages, sending, activeTab, onNavigate]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
    setFollowUps([]);
  }, []);

  return { messages, sending, error, followUps, send, reset };
}
