import { useCallback, useEffect, useRef, useState } from "react";
import { getAccessToken } from "../../lib/api";
import type { TabId } from "../../types";
import { requestChief } from "./chief-transport";

export type ChiefChatRole = "user" | "assistant";
export type ChiefChatMessage = { id: string; role: ChiefChatRole; content: string };
export type ChiefAction = { type: "navigate"; tab: TabId };
const TABS = new Set<string>(["home", "stocks", "crypto", "penny", "betting", "predictions"]);
const newId = () => `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export function useChiefChat(opts: { activeTab: TabId; onNavigate: (tab: TabId) => void; userId?: string }) {
  const [messages, setMessages] = useState<ChiefChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [degraded, setDegraded] = useState(false);
  const history = useRef<ChiefChatMessage[]>([]);
  const controller = useRef<AbortController | null>(null);
  const pending = useRef<ChiefChatMessage[] | null>(null);
  const sequence = useRef(0);

  const reset = useCallback(() => {
    sequence.current += 1;
    controller.current?.abort();
    controller.current = null;
    history.current = [];
    pending.current = null;
    setMessages([]); setSending(false); setError(null); setFollowUps([]); setDegraded(false);
  }, []);

  useEffect(() => {
    reset();
    return () => { sequence.current += 1; controller.current?.abort(); controller.current = null; };
  }, [opts.userId, reset]);

  const perform = useCallback(async (next: ChiefChatMessage[]) => {
    if (controller.current) return false;
    const ctrl = new AbortController();
    controller.current = ctrl;
    const seq = ++sequence.current;
    pending.current = next;
    setSending(true); setError(null); setFollowUps([]); setDegraded(false);
    const lastQuestion = next[next.length - 1]?.content ?? "";
    try {
      let token: string | null = null;
      try { token = getAccessToken(); } catch { /* Cookie session still works without storage. */ }
      const result = await requestChief(next.map(({ role, content }) => ({ role, content })), {
        tab: opts.activeTab, symbol: lastQuestion.match(/\$([A-Za-z]{1,10})\b/)?.[1]?.toUpperCase(),
      }, { signal: ctrl.signal, token });
      if (seq !== sequence.current) return false;
      const complete = [...next, { id: newId(), role: "assistant" as const, content: result.reply }];
      history.current = complete;
      pending.current = null;
      setMessages(complete); setFollowUps(result.followUps ?? []); setDegraded(result.degraded === true);
      for (const action of result.actions ?? []) {
        if (action.type === "navigate" && typeof action.tab === "string" && TABS.has(action.tab)) opts.onNavigate(action.tab as TabId);
      }
      return true;
    } catch (e) {
      if (seq === sequence.current) setError(e instanceof Error ? e.message : "Could not reach Ask Motive. Please retry.");
      return false;
    } finally {
      if (seq === sequence.current) { controller.current = null; setSending(false); }
    }
  }, [opts.activeTab, opts.onNavigate]);

  const send = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || controller.current) return false;
    // Re-submitting a failed question reuses its turn rather than duplicating it.
    if (pending.current?.[pending.current.length - 1]?.content === content) return perform(pending.current);
    const next = [...history.current, { id: newId(), role: "user" as const, content }];
    history.current = next;
    setMessages(next);
    return perform(next);
  }, [perform]);
  const retry = useCallback(() => pending.current ? perform(pending.current) : Promise.resolve(false), [perform]);
  const cancel = useCallback(() => controller.current?.abort(), []);
  return { messages, sending, error, followUps, degraded, send, retry, cancel, reset };
}
