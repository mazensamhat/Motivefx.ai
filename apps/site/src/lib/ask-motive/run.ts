import { generateText, stepCountIs, tool } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import type { TerminalPlan } from "@/lib/terminal/plan";
import { CHIEF_DISCLAIMER, CHIEF_OF_FINANCE_SYSTEM_PROMPT } from "./system-prompt";
import {
  buildUserProfile,
  resolveNavigateTab,
  suggestFollowUps,
  tabAwareHint,
  toolAnalyzePortfolio,
  toolExplainNavigation,
  toolExplainSymbol,
  toolGetBriefing,
  toolListOpportunities,
  toolScanAllPortfolios,
  type AskAction,
} from "./tools";

export type AskMessage = { role: "user" | "assistant" | "system"; content: string };

export type AskMotiveResult = {
  reply: string;
  actions: AskAction[];
  usedTools: string[];
  followUps: string[];
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

function extractTicker(q: string): string | null {
  const m = q.match(/\$([A-Za-z]{1,10})\b/) || q.match(/\bexplain\s+([A-Za-z]{2,10})\b/i);
  return m?.[1]?.toUpperCase() ?? null;
}

function finish(
  reply: string,
  usedTools: string[],
  actions: AskAction[],
  ctx: RunCtx,
  degraded: boolean
): AskMotiveResult {
  return {
    reply: withDisclaimer(reply),
    actions,
    usedTools: [...new Set(usedTools)],
    followUps: suggestFollowUps(usedTools, ctx.context?.tab, ctx.context?.symbol),
    degraded,
  };
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
      return finish(`Opening **${tab}** for you. Ask me anything once you're there.`, usedTools, actions, ctx, true);
    }
  }

  const ticker = extractTicker(q) || (ctx.context?.symbol ? ctx.context.symbol.toUpperCase() : null);
  if (ticker && /explain|about|what.?s|signal|look at|check/.test(q)) {
    usedTools.push("explain_symbol");
    const data = await toolExplainSymbol(ticker);
    if (data.empty) {
      return finish(
        `No live MotiveFX feed flags for **${ticker}** right now. Try the Trades / Crypto / Pink Slips scanners, or ask for today's top opportunities.`,
        usedTools,
        actions,
        ctx,
        true
      );
    }
    const bits: string[] = [`Here's the desk lens on **${ticker}**:`];
    if (data.unusualOptions?.length) {
      bits.push(
        `• Options: ${data.unusualOptions
          .map((o) => `${o.type} flow${o.volOiRatio != null ? ` · Vol/OI ${o.volOiRatio}x` : ""}`)
          .join("; ")}`
      );
    }
    if (data.pennyMovers?.length) {
      bits.push(
        `• Microcap: ${data.pennyMovers
          .map((p) => `${p.changePct != null ? `${p.changePct}%` : "move"} · vol ${p.volRatio ?? "—"}x`)
          .join("; ")}`
      );
    }
    if (data.whaleAlerts?.length) {
      bits.push(
        `• Whale: ${data.whaleAlerts
          .map((w) => `$${(Number(w.amountUsd) / 1_000_000).toFixed(1)}M ${w.direction}`)
          .join("; ")}`
      );
    }
    if (data.congress?.length) {
      bits.push(`• Disclosure flags: ${data.congress.length} recent filing(s) cross-checked.`);
    }
    bits.push("Informational feed context — not a forecast.");
    return finish(bits.join("\n"), usedTools, actions, ctx, true);
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
    return finish(
      lines.length
        ? `Here are today's top MotiveFX signals:\n\n${lines.join("\n")}\n\nOpen Home → Today's Signals for the full board.`
        : "No ranked opportunities right now — desks may still be warming up. Try Home → Retry, or open Trades / Crypto for live scanners.",
      usedTools,
      actions,
      ctx,
      true
    );
  }

  if (/whole portfolio|entire portfolio|all (my )?desk|scan (my )?book|across (all )?desk|everything i (own|hold)/.test(q)) {
    usedTools.push("scan_all_portfolios");
    const scan = await toolScanAllPortfolios(ctx.userId);
    const lines: string[] = [`Scanned **${scan.desksScanned}** desks · **${scan.desksWithData}** with data.`];
    for (const r of scan.results) {
      if ("empty" in r && r.empty) {
        lines.push(`• ${r.module}: empty — ${r.message}`);
        continue;
      }
      const recs =
        "recommendations" in r && Array.isArray(r.recommendations)
          ? r.recommendations
              .slice(0, 2)
              .map(
                (x: { symbol: string; action: string; confidence: number }) =>
                  `${x.symbol} (${String(x.action).replace(/_/g, " ")}, ${x.confidence}%)`
              )
              .join("; ")
          : "";
      lines.push(`• **${r.module}**: ${"summary" in r ? r.summary : ""}${recs ? ` — ${recs}` : ""}`);
    }
    return finish(lines.join("\n"), usedTools, actions, ctx, true);
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
      return finish(String(data.message), usedTools, [
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
      ], ctx, true);
    }
    const recs =
      ("recommendations" in data && Array.isArray(data.recommendations)
        ? data.recommendations
        : []
      ).map(
        (r: { symbol: string; action: string; confidence: number; headline: string }) =>
          `• **${r.symbol}** — ${r.action.replace(/_/g, " ")} (${r.confidence}%) · ${r.headline}`
      ) ?? [];
    return finish(
      `${data.summary}\n\n${recs.join("\n") || "No stance rows returned."}\n\nStances are informational Motive Signals — not trade orders.`,
      usedTools,
      actions,
      ctx,
      true
    );
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
    return finish(`${nav.guide}\n\n${nav.tip}`, usedTools, actions, ctx, true);
  }

  usedTools.push("get_briefing");
  const briefing = await toolGetBriefing({
    userId: ctx.userId,
    displayName: ctx.displayName,
    plan: ctx.plan,
  });
  const top = briefing.opportunities?.[0];
  return finish(
    [
      `${briefing.greeting}. I'm your A.I. Chief of Finance.`,
      `Desk score **${briefing.motivfxScore}/100** (${briefing.marketConfidence}). ${briefing.topAiTip ?? ""}`,
      top
        ? `Top flag: **${top.symbol}** — ${top.title} (${top.confidence}%).`
        : "Ask me to scan your whole portfolio, list today's opportunities, or navigate to a desk.",
      "Try: “Scan my whole portfolio” · “What are today's top opportunities?” · “Go to Crypto”.",
    ]
      .filter(Boolean)
      .join("\n\n"),
    usedTools,
    actions,
    ctx,
    true
  );
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

  let profileBlock = "";
  try {
    const profile = await Promise.race([
      buildUserProfile(ctx.userId),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 2_000)),
    ]);
    if (profile) {
      profileBlock = `\n\nUser profile (deterministic):\n${JSON.stringify(profile)}`;
    }
  } catch {
    /* ignore profile hydrate */
  }

  const contextNote = [
    ctx.context?.tab ? `Active tab: ${ctx.context.tab}.` : null,
    ctx.context?.symbol ? `Focused symbol: ${ctx.context.symbol}.` : null,
    tabAwareHint(ctx.context?.tab),
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const result = await Promise.race([
      generateText({
        model: openai(modelId),
        system: `${CHIEF_OF_FINANCE_SYSTEM_PROMPT}\n\nSession context: ${contextNote}${profileBlock}`,
        messages: messages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .slice(-14)
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        stopWhen: stepCountIs(6),
        maxOutputTokens: 900,
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
              "Analyze one desk ledger and return Motive Signal stances (informational).",
            inputSchema: z.object({
              module: z.enum(["trades", "crypto", "penny", "betting", "predictions"]),
            }),
            execute: async ({ module }) => {
              usedTools.push("analyze_portfolio");
              return toolAnalyzePortfolio({ userId: ctx.userId, module });
            },
          }),
          scan_all_portfolios: tool({
            description:
              "Scan ALL desks in parallel (trades, crypto, penny, betting, predictions). Use for whole-book / entire portfolio questions.",
            inputSchema: z.object({}),
            execute: async () => {
              usedTools.push("scan_all_portfolios");
              return toolScanAllPortfolios(ctx.userId);
            },
          }),
          explain_symbol: tool({
            description:
              "Lens a ticker across unusual options, penny movers, whale alerts, and congress disclosures.",
            inputSchema: z.object({
              symbol: z.string().describe("Ticker e.g. NVDA or BTC"),
            }),
            execute: async ({ symbol }) => {
              usedTools.push("explain_symbol");
              return toolExplainSymbol(symbol);
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
        setTimeout(() => reject(new Error("ask_motive_timeout")), 14_000);
      }),
    ]);

    const text = result.text?.trim() || "I'm here — try asking about opportunities or your portfolio.";
    return finish(text, usedTools, actions, ctx, false);
  } catch {
    return runAskMotiveFallback(messages, ctx);
  }
}
