import { generateText, stepCountIs, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { after } from "next/server";
import { z } from "zod";
import type { TerminalPlan } from "@/lib/terminal/plan";
import { CHIEF_DISCLAIMER, CHIEF_OF_FINANCE_SYSTEM_PROMPT } from "./system-prompt";
import type { AskMessage, AskMotiveResult } from "./run";
import { withDeadline } from "./deadline";
import { classifyAskFailure, createRequestEvidence, finalAnswerStep, PORTFOLIO_MODULES,
  summarizePortfolioScan, unavailableEvidence, type PortfolioEvidence, type PortfolioModule } from "./request-evidence";
import { resolveNavigateTab, suggestFollowUps, tabAwareHint, toolAnalyzePortfolio,
  toolExplainNavigation, toolExplainSymbol, toolGetBriefing, type AskAction } from "./tools";

type Context = {
  userId: string;
  displayName: string | null;
  plan: TerminalPlan | null;
  context?: { tab?: string; symbol?: string };
};

export async function runAskMotiveBounded(messages: AskMessage[], ctx: Context, signal: AbortSignal): Promise<AskMotiveResult> {
  const startedAt = Date.now();
  let partialData = false;
  let outcome = "error";
  let errorCode: string | undefined;
  let inputTokens = 0;
  let outputTokens = 0;
  const usedTools: string[] = [];
  const modelId = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const hasModel = Boolean(process.env.OPENAI_API_KEY?.trim());
  const actions: AskAction[] = [];
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  if (signal.aborted) onAbort();
  else signal.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(onAbort, 28_000);
  const evidence = createRequestEvidence(controller.signal);
  const allowed = PORTFOLIO_MODULES.filter((m) => ctx.plan?.allowedMarkets.includes(m));
  const failedTools = new Set<string>();
  const observe = async <T,>(key: string, work: () => Promise<T>, module?: PortfolioModule) => {
    try {
      return await evidence.read(key, () => withDeadline(work, 7_000, key, controller.signal));
    } catch (err) {
      if (controller.signal.aborted) throw err;
      partialData = true;
      failedTools.add(key.split(":")[0]);
      return unavailableEvidence(module);
    }
  };
  const briefing = () => observe("briefing", () => toolGetBriefing(ctx));
  const analyze = async (module: PortfolioModule) => {
    if (!allowed.includes(module)) return { module, empty: false, unavailable: true, locked: true,
      message: "This market is not included in the verified session's access. No ledger was read." };
    return observe(`portfolio:${module}`, () => toolAnalyzePortfolio({ userId: ctx.userId, module }), module);
  };
  const scan = async () => {
    const results = await Promise.all(allowed.map(analyze));
    return summarizePortfolioScan(results as PortfolioEvidence[]);
  };
  const opportunities = async (limit = 5) => {
    const result = await briefing();
    if ("unavailable" in result) return result;
    return { count: result.opportunityCount, top: result.opportunities.slice(0, Math.min(8, Math.max(1, limit))) };
  };
  const finish = (reply: string, degraded = false): AskMotiveResult => ({
    reply: /not financial advice/i.test(reply) ? reply : `${reply}\n\n${CHIEF_DISCLAIMER}`,
    actions, usedTools: [...new Set(usedTools)],
    followUps: suggestFollowUps(usedTools, ctx.context?.tab, ctx.context?.symbol), degraded,
  });
  try {
    if (!hasModel) {
      // Keep deterministic navigation and real evidence available without pretending an AI answered.
      const result = await runEvidenceFallback(messages, ctx, { briefing, opportunities, analyze, scan }, usedTools, actions);
      outcome = "degraded";
      errorCode = "model_not_configured";
      return finish(`AI generation is unavailable. Here is the available product/data response.\n\n${result}`, true);
    }
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim() });
    const result = await withDeadline(() => generateText({
      model: openai(modelId), abortSignal: controller.signal, maxRetries: 0,
      system: `${CHIEF_OF_FINANCE_SYSTEM_PROMPT}\nActive tab: ${ctx.context?.tab ?? "home"}. Focus: ${ctx.context?.symbol ?? "none"}. ${tabAwareHint(ctx.context?.tab)}\nWhen a tool reports unavailable or partial, explain the limitation. A failed read never means the ledger is empty. Do not recommend recreating saved positions. Never fabricate prices, holdings, signals or results. Use completed tool evidence to produce a final answer; do not repeat the same data request.`,
      messages: messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-14)
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      stopWhen: stepCountIs(4), maxOutputTokens: 900,
      prepareStep: ({ stepNumber }) => finalAnswerStep(stepNumber),
      tools: {
        get_briefing: tool({ description: "Get today's briefing and signals.", inputSchema: z.object({}),
          execute: async () => { usedTools.push("get_briefing"); return briefing(); } }),
        list_opportunities: tool({ description: "List current opportunities across authorized desks.", inputSchema: z.object({ limit: z.number().int().min(1).max(8).optional() }),
          execute: async ({ limit }) => { usedTools.push("list_opportunities"); return opportunities(limit); } }),
        analyze_portfolio: tool({ description: "Analyze one authorized user's desk ledger. Unavailable is distinct from empty.", inputSchema: z.object({ module: z.enum(["trades", "crypto", "penny", "betting", "predictions"]) }),
          execute: async ({ module }) => { usedTools.push("analyze_portfolio"); return analyze(module); } }),
        scan_all_portfolios: tool({ description: "Review all authorized saved ledgers, reporting unavailable desks separately from empty ones.", inputSchema: z.object({}),
          execute: async () => { usedTools.push("scan_all_portfolios"); return scan(); } }),
        explain_symbol: tool({ description: "Get feed evidence for a ticker.", inputSchema: z.object({ symbol: z.string().min(1).max(50) }),
          execute: async ({ symbol }) => { usedTools.push("explain_symbol"); const normalized = symbol.trim().replace(/^\$/, "").toUpperCase(); return observe(`symbol:${normalized}`, () => toolExplainSymbol(normalized)); } }),
        explain_navigation: tool({ description: "Explain a product area.", inputSchema: z.object({ topic: z.string().max(120) }),
          execute: async ({ topic }) => { usedTools.push("explain_navigation"); return toolExplainNavigation(topic); } }),
        navigate_desk: tool({ description: "Open a requested desk.", inputSchema: z.object({ tab: z.enum(["home", "stocks", "penny", "crypto", "betting", "predictions"]) }),
          execute: async ({ tab }) => { usedTools.push("navigate_desk"); actions.push({ type: "navigate", tab }); return { ok: true, tab }; } }),
      },
    }), 29_000, "generation", signal);
    inputTokens = result.usage.inputTokens ?? 0;
    outputTokens = result.usage.outputTokens ?? 0;
    const text = result.text?.trim();
    if (!text) throw new Error("ask_motive_empty_response");
    outcome = partialData ? "degraded" : "ok";
    return finish(text, partialData);
  } catch (err) {
    errorCode = classifyAskFailure(err);
    throw err;
  } finally {
    const durationMs = Date.now() - startedAt;
    clearTimeout(timer); controller.abort(); signal.removeEventListener("abort", onAbort);
    // Next.js tracks this write after the response. No soft timeout abandons a pending DB write.
    // A telemetry failure must not replace a valid model answer with an API error.
    try {
      after(async () => {
        try {
          const { recordAiUsage } = await import("@/lib/ops/durable");
          await recordAiUsage({ userId: ctx.userId, feature: "ASK_MOTIVE", model: hasModel ? modelId : "deterministic",
            promptVersion: "ask-motive-v3-evidence", inputTokens, outputTokens, durationMs, status: outcome,
            errorCode, grounding: partialData ? "PARTIALLY_GROUNDED" : usedTools.length ? "GROUNDED" : "PARTIALLY_GROUNDED",
            metadata: { tools: [...new Set(usedTools)], failedTools: [...failedTools], ...evidence.stats() } });
        } catch { console.warn("[ask-motive] metering unavailable"); }
      });
    } catch { console.warn("[ask-motive] metering not scheduled"); }
  }
}

type FallbackReaders = {
  briefing: () => Promise<unknown>;
  opportunities: (limit?: number) => Promise<unknown>;
  analyze: (module: PortfolioModule) => Promise<unknown>;
  scan: () => Promise<unknown>;
};
function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function portfolioText(value: unknown): string {
  const row = record(value);
  const module = typeof row.module === "string" ? row.module : "Requested";
  if (row.unavailable === true) return `${module}: saved ledger could not be read. Its contents are unknown, not empty.`;
  if (row.empty === true) return `${module}: the saved ledger was read successfully; no open positions were found.`;
  return `${module}: ${typeof row.summary === "string" ? row.summary : "Saved positions were found. Open the desk for their details."}`;
}
async function runEvidenceFallback(messages: AskMessage[], ctx: Context, readers: FallbackReaders, tools: string[], actions: AskAction[]) {
  const q = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const nav = q.match(/^(?:go to|open|take me to|navigate to)\s+(home|stocks?|trades?|crypto|pink\s*sheets?|pink\s*slips?|penny|sports?|bets?|betting|predictions?)\s*[.!]?$/i);
  if (nav) {
    const label = nav[1].toLowerCase().replace(/\s+/g, "");
    const tab = resolveNavigateTab(/^pink/.test(label) ? "penny" : /^sport/.test(label) ? "betting" : label);
    if (tab) { tools.push("navigate_desk"); actions.push({ type: "navigate", tab }); return `Opening ${tab}.`; }
  }
  if (/where|how do i|help|glossary|explain.*desk/i.test(q)) {
    tools.push("explain_navigation");
    const result = toolExplainNavigation(/holding|portfolio|ledger/i.test(q) ? "holdings" : /glossary/i.test(q) ? "glossary" : ctx.context?.tab ?? "home");
    return `${result.guide}\n\n${result.tip}`;
  }
  if (/whole|entire|all.*(?:portfolio|desk)|across/i.test(q)) {
    tools.push("scan_all_portfolios");
    const result = record(await readers.scan());
    return Array.isArray(result.results) ? result.results.map(portfolioText).join("\n\n") : "The saved ledgers are unavailable. Do not recreate them as a recovery step.";
  }
  if (/portfolio|holding|my ledger|my book/i.test(q)) {
    tools.push("analyze_portfolio");
    const tab = ctx.context?.tab;
    const module: PortfolioModule = /crypto/i.test(q) ? "crypto" : /pink|penny/i.test(q) ? "penny" : /bet|sport/i.test(q) ? "betting" : /predict/i.test(q) ? "predictions" : tab === "crypto" || tab === "penny" || tab === "betting" || tab === "predictions" ? tab : "trades";
    return portfolioText(await readers.analyze(module));
  }
  if (/opportunit|signal|radar|today/i.test(q)) {
    tools.push("list_opportunities");
    const result = record(await readers.opportunities());
    if (result.unavailable) return "Current signal data could not be read. No new ranking or forecast is being asserted.";
    const rows = Array.isArray(result.top) ? result.top : [];
    return rows.length ? rows.map((value) => {
      const row = record(value);
      const score = typeof row.confidence === "number" && Number.isFinite(row.confidence) ? `; Motive Signal ${row.confidence}/100 (not a probability)` : "";
      return `${String(row.symbol ?? "Market item")}: ${String(row.title ?? row.stance ?? "review available context")}${score}`;
    }).join("\n") : "No ranked items were returned by the currently available briefing. This does not establish that every source is healthy.";
  }
  return "Your question is saved. Live AI generation is unavailable; you can still open a desk, review recorded portfolio details, or request available signals.";
}
