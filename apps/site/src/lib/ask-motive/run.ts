import { generateText, stepCountIs, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import type { TerminalPlan } from "@/lib/terminal/plan";
import { CHIEF_DISCLAIMER, CHIEF_OF_FINANCE_SYSTEM_PROMPT } from "./system-prompt";
import {
  resolveNavigateTab,
  toolAnalyzePortfolio,
  toolExplainNavigation,
  toolGetBriefing,
  toolListOpportunities,
  type AskAction,
} from "./tools";

export type AskMessage = { role: "user" | "assistant" | "system"; content: string };

export type AskMotiveResult = {
  reply: string;
  actions: AskAction[];
  usedTools: string[];
  degraded: boolean;
};

type RunCtx = {
  userId: string;
  displayName: string | null;
  plan: TerminalPlan | null;
  context?: { tab?: string; symbol?: string };
};

function hasOpenAiKey() {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function lastUserText(messages: AskMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user" && messages[i].content.trim()) {
      return messages[i].content.trim();
    }
  }
  return "";
}

function withDisclaimer(text: string): string {
  const trimmed = text.trim();
  if (trimmed.toLowerCase().includes("not financial advice")) return trimmed;
  return `${trimmed}\n\n${CHIEF_DISCLAIMER}`;
}

/** Keyword / intent fallback when OpenAI is unavailable. */
export async function runAskMotiveFallback(
  messages: AskMessage[],
  ctx: RunCtx
): Promise<AskMotiveResult> {
  const q = lastUserText(messages).toLowerCase();
  const usedTools: string[] = [];
  const actions: AskAction[] = [];

  const navMatch = q.match(
    /\b(?:go to|open|take me to|navigate to|show)\s+(home|trades?|stocks?|crypto|penny|pink\s*slips?|bets?|betting|predictions?|polymarket)\b/i
  );
  if (navMatch) {
    const tab = resolveNavigateTab(navMatch[1].replace(/\s+/g, ""));
    if (tab) {
      usedTools.push("navigate_desk");
      actions.push({ type: "navigate", tab });
      return {
        reply: withDisclaimer(`Opening **${tab}** for you. Ask me anything once you're there.`),
        actions,
        usedTools,
        degraded: true,
      };
    }
  }

  if (/opportunit|today.?s signal|what.?s hot|top signal|radar/.test(q)) {
    usedTools.push("list_opportunities");
    const data = await toolListOpportunities({
      userId: ctx.userId,
      displayName: ctx.displayName,
      plan: ctx.plan,
      limit: 5,
    });
    const lines =
      data.top?.map(
        (o) =>
          `• **${o.symbol}** — ${o.title ?? o.stance ?? "signal"} (${o.confidence}% · ${o.module})`
      ) ?? [];
    return {
      reply: withDisclaimer(
        lines.length
          ? `Here are today's top MotiveFX signals:\n\n${lines.join("\n")}\n\nOpen Home → Today's Signals for the full board.`
          : "No ranked opportunities right now — desks may still be warming up. Try Home → Retry, or open Trades / Crypto for live scanners."
      ),
      actions,
      usedTools,
      degraded: true,
    };
  }

  if (/portfolio|holding|analyze my|my ledger|what do i (own|hold)/.test(q)) {
    const moduleGuess = /crypto/.test(q)
      ? "crypto"
      : /penny|pink/.test(q)
        ? "penny"
        : /bet/.test(q)
          ? "betting"
          : /predict|poly/.test(q)
            ? "predictions"
            : "trades";
    usedTools.push("analyze_portfolio");
    const data = await toolAnalyzePortfolio({ userId: ctx.userId, module: moduleGuess });
    if (data.empty) {
      return {
        reply: withDisclaimer(String(data.message)),
        actions: [
          {
            type: "navigate",
            tab:
              moduleGuess === "trades"
                ? "stocks"
                : moduleGuess === "penny"
                  ? "penny"
                  : moduleGuess === "crypto"
                    ? "crypto"
                    : moduleGuess === "betting"
                      ? "betting"
                      : "predictions",
          },
        ],
        usedTools,
        degraded: true,
      };
    }
    const recs =
      ("recommendations" in data && Array.isArray(data.recommendations)
        ? data.recommendations
        : []
      ).map(
        (r: { symbol: string; action: string; confidence: number; headline: string }) =>
          `• **${r.symbol}** — ${r.action.replace(/_/g, " ")} (${r.confidence}%) · ${r.headline}`
      ) ?? [];
    return {
      reply: withDisclaimer(
        `${data.summary}\n\n${recs.join("\n") || "No stance rows returned."}\n\nStances are informational Motive Signals — not trade orders.`
      ),
      actions,
      usedTools,
      degraded: true,
    };
  }

  if (/where|how do i|navigate|add holding|watchlist|broker|glossary|confused|help/.test(q)) {
    usedTools.push("explain_navigation");
    const topic = /holding|portfolio|ledger/.test(q)
      ? "holdings"
      : /watch|radar/.test(q)
        ? "watchlist"
        : /broker|apps/.test(q)
          ? "brokers"
          : /gloss/.test(q)
            ? "glossary"
            : /crypto/.test(q)
              ? "crypto"
              : /bet/.test(q)
                ? "betting"
                : /penny|pink/.test(q)
                  ? "penny"
                  : /predict|poly/.test(q)
                    ? "predictions"
                    : /trade|stock/.test(q)
                      ? "stocks"
                      : "home";
    const nav = toolExplainNavigation(topic);
    return {
      reply: withDisclaimer(`${nav.guide}\n\n${nav.tip}`),
      actions,
      usedTools,
      degraded: true,
    };
  }

  usedTools.push("get_briefing");
  const briefing = await toolGetBriefing({
    userId: ctx.userId,
    displayName: ctx.displayName,
    plan: ctx.plan,
  });
  const top = briefing.opportunities?.[0];
  return {
    reply: withDisclaimer(
      [
        `${briefing.greeting}. I'm your A.I. Chief of Finance.`,
        `Desk score **${briefing.motivfxScore}/100** (${briefing.marketConfidence}). ${briefing.topAiTip ?? ""}`,
        top
          ? `Top flag: **${top.symbol}** — ${top.title} (${top.confidence}%).`
          : "Ask me to analyze your portfolio, list today's opportunities, or navigate to a desk.",
        "Try: “What are today's top opportunities?” · “Analyze my portfolio” · “Go to Crypto”.",
      ]
        .filter(Boolean)
        .join("\n\n")
    ),
    actions,
    usedTools,
    degraded: true,
  };
}

export async function runAskMotive(
  messages: AskMessage[],
  ctx: RunCtx
): Promise<AskMotiveResult> {
  if (!hasOpenAiKey()) {
    return runAskMotiveFallback(messages, ctx);
  }

  const actions: AskAction[] = [];
  const usedTools: string[] = [];

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY!.trim() });
  const modelId = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const contextNote = [
    ctx.context?.tab ? `User is viewing tab: ${ctx.context.tab}.` : null,
    ctx.context?.symbol ? `Focused symbol: ${ctx.context.symbol}.` : null,
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const result = await Promise.race([
      generateText({
        model: openai(modelId),
        system: `${CHIEF_OF_FINANCE_SYSTEM_PROMPT}${contextNote ? `\n\nSession context: ${contextNote}` : ""}`,
        messages: messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-12)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        stopWhen: stepCountIs(4),
        maxOutputTokens: 700,
        tools: {
          get_briefing: tool({
            description: "Fetch today's MotiveFX home briefing score and top signals.",
            inputSchema: z.object({}),
            execute: async () => {
              usedTools.push("get_briefing");
              return toolGetBriefing({
                userId: ctx.userId,
                displayName: ctx.displayName,
                plan: ctx.plan,
              });
            },
          }),
          list_opportunities: tool({
            description: "List today's top ranked opportunities / signals across desks.",
            inputSchema: z.object({
              limit: z.number().int().min(1).max(8).optional(),
            }),
            execute: async ({ limit }) => {
              usedTools.push("list_opportunities");
              return toolListOpportunities({
                userId: ctx.userId,
                displayName: ctx.displayName,
                plan: ctx.plan,
                limit,
              });
            },
          }),
          analyze_portfolio: tool({
            description:
              "Analyze the user's ledger for a module and return Motive Signal stances (informational).",
            inputSchema: z.object({
              module: z.enum(["trades", "crypto", "penny", "betting", "predictions"]),
            }),
            execute: async ({ module }) => {
              usedTools.push("analyze_portfolio");
              return toolAnalyzePortfolio({ userId: ctx.userId, module });
            },
          }),
          explain_navigation: tool({
            description: "Explain how to use a desk or product area (holdings, watchlist, brokers, etc.).",
            inputSchema: z.object({
              topic: z
                .string()
                .describe("e.g. home, stocks, crypto, holdings, watchlist, brokers, glossary"),
            }),
            execute: async ({ topic }) => {
              usedTools.push("explain_navigation");
              return toolExplainNavigation(topic);
            },
          }),
          navigate_desk: tool({
            description: "Request the UI to switch to a terminal desk/tab.",
            inputSchema: z.object({
              tab: z.enum(["home", "stocks", "penny", "crypto", "betting", "predictions"]),
            }),
            execute: async ({ tab }) => {
              usedTools.push("navigate_desk");
              actions.push({ type: "navigate", tab });
              return { ok: true, tab, message: `Navigating to ${tab}.` };
            },
          }),
        },
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("ask_motive_timeout")), 12_000);
      }),
    ]);

    const text = result.text?.trim() || "I'm here — try asking about opportunities or your portfolio.";
    return {
      reply: withDisclaimer(text),
      actions,
      usedTools: [...new Set(usedTools)],
      degraded: false,
    };
  } catch {
    return runAskMotiveFallback(messages, ctx);
  }
}
