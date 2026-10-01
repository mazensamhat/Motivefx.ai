import { generateText, stepCountIs, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { after } from "next/server";
import { z } from "zod";
import type { TerminalPlan } from "@/lib/terminal/plan";
import { CHIEF_DISCLAIMER, CHIEF_OF_FINANCE_SYSTEM_PROMPT } from "./system-prompt";
import { runAskMotiveFallback, type AskMessage, type AskMotiveResult } from "./run";
import { withDeadline } from "./deadline";
import { suggestFollowUps, tabAwareHint, toolAnalyzePortfolio, toolExplainNavigation,
  toolExplainSymbol, toolGetBriefing, toolListOpportunities, toolScanAllPortfolios,
  type AskAction } from "./tools";

type Context = {
  userId: string;
  displayName: string | null;
  plan: TerminalPlan | null;
  context?: { tab?: string; symbol?: string };
};

/** Bounded orchestration; optional usage logging is never on the response critical path. */
export async function runAskMotiveBounded(messages: AskMessage[], ctx: Context, signal: AbortSignal): Promise<AskMotiveResult> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return withDeadline(() => runAskMotiveFallback(messages, ctx), 8_000, "fallback", signal);
  }
  const usedTools: string[] = [];
  const actions: AskAction[] = [];
  const modelId = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal.aborted) onAbort();
  else signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(onAbort, 28_000);
  const observe = async <T,>(name: string, work: () => Promise<T>) => {
    usedTools.push(name);
    try { return await withDeadline(work, 7_000, name, controller.signal); }
    catch {
      if (controller.signal.aborted) throw new Error("ask_motive_cancelled");
      return { unavailable: true, message: "This data source could not respond. Do not treat missing data as an empty portfolio or invent values." };
    }
  };
  try {
    const result = await withDeadline(() => generateText({
      model: openai(modelId), abortSignal: controller.signal, maxRetries: 0,
      system: `${CHIEF_OF_FINANCE_SYSTEM_PROMPT}\nActive tab: ${ctx.context?.tab ?? "home"}. Focus: ${ctx.context?.symbol ?? "none"}. ${tabAwareHint(ctx.context?.tab)}\nIf a tool reports unavailable, explain that limitation. Never fabricate prices, holdings, signals, or results.`,
      messages: messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-14)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      stopWhen: stepCountIs(4), maxOutputTokens: 900,
      tools: {
        get_briefing: tool({ description: "Get today's briefing and signals.", inputSchema: z.object({}),
          execute: async () => observe("get_briefing", () => toolGetBriefing(ctx)) }),
        list_opportunities: tool({ description: "List current opportunities across desks.", inputSchema: z.object({ limit: z.number().int().min(1).max(8).optional() }),
          execute: async ({ limit }) => observe("list_opportunities", () => toolListOpportunities({ ...ctx, limit })) }),
        analyze_portfolio: tool({ description: "Analyze one user's desk ledger, informational only.", inputSchema: z.object({ module: z.enum(["trades", "crypto", "penny", "betting", "predictions"]) }),
          execute: async ({ module }) => observe("analyze_portfolio", () => toolAnalyzePortfolio({ userId: ctx.userId, module })) }),
        scan_all_portfolios: tool({ description: "Review the user's complete book across desks.", inputSchema: z.object({}),
          execute: async () => observe("scan_all_portfolios", () => toolScanAllPortfolios(ctx.userId)) }),
        explain_symbol: tool({ description: "Get feed evidence for a ticker.", inputSchema: z.object({ symbol: z.string().min(1).max(50) }),
          execute: async ({ symbol }) => observe("explain_symbol", () => toolExplainSymbol(symbol)) }),
        explain_navigation: tool({ description: "Explain a product area.", inputSchema: z.object({ topic: z.string().max(120) }),
          execute: async ({ topic }) => { usedTools.push("explain_navigation"); return toolExplainNavigation(topic); } }),
        navigate_desk: tool({ description: "Open a requested desk.", inputSchema: z.object({ tab: z.enum(["home", "stocks", "penny", "crypto", "betting", "predictions"]) }),
          execute: async ({ tab }) => { usedTools.push("navigate_desk"); actions.push({ type: "navigate", tab }); return { ok: true, tab }; } }),
      },
    }), 29_000, "generation", signal);
    const text = result.text?.trim();
    if (!text) throw new Error("ask_motive_empty_response");
    after(async () => {
      try {
        const { recordAiUsage } = await import("@/lib/ops/durable");
        await withDeadline(() => recordAiUsage({ userId: ctx.userId, feature: "ASK_MOTIVE", model: modelId,
          promptVersion: "ask-motive-v2-bounded", inputTokens: result.usage.inputTokens ?? 0,
          outputTokens: result.usage.outputTokens ?? 0, status: "ok",
          grounding: usedTools.length ? "GROUNDED" : "PARTIALLY_GROUNDED", metadata: { tools: usedTools } }), 2_000, "metering");
      } catch { console.warn("[ask-motive] metering unavailable"); }
    });
    return { reply: /not financial advice/i.test(text) ? text : `${text}\n\n${CHIEF_DISCLAIMER}`,
      actions, usedTools: [...new Set(usedTools)],
      followUps: suggestFollowUps(usedTools, ctx.context?.tab, ctx.context?.symbol), degraded: false };
  } finally {
    clearTimeout(timer); controller.abort(); signal.removeEventListener("abort", onAbort);
  }
}
