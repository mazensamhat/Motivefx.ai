import type { BrandModuleId } from "../brand/moduleBrand";
import { MODULE_BRAND } from "../brand/moduleBrand";
import { formatTime, formatUsd, formatShares, formatPrice } from "./formatActivity";
import {
  buildPlainBrief,
  stancePlainExplain,
  type SignalChip,
} from "./signalClarity";
import { buildMotiveScorecard, type MotiveScorecard } from "./motiveScorecard";
import { generateMicroSeries, hashSeed } from "./sparkline";

export interface DeepDiveKpi {
  label: string;
  value: string;
  /** Optional plain-language subtitle under the KPI label */
  hint?: string;
  highlight?: boolean;
}

export interface AssetDeepDivePayload {
  title: string;
  timestamp: string;
  moduleLabel: string;
  statusBadge: string;
  statusVariant: "bullish" | "bearish" | "neutral";
  kpis: DeepDiveKpi[];
  chartPoints: number[];
  chartDesc: string;
  /** Kept for backward compat — mirrors plainSummary / brief narrative */
  aiAdvice: string;
  confidence: number;
  linkSymbol?: string;
  linkQuery?: string;
  plainSummary: string;
  whatItMeans: string[];
  whatToWatch: string[];
  signalStack: SignalChip[];
  stanceExplain: string;
  scorecard: MotiveScorecard;
}

function rowSeed(row: Record<string, unknown>): number {
  return hashSeed(String(row.id ?? row.symbol ?? row.market ?? row.matchup ?? "row"));
}

function isBullish(row: Record<string, unknown>): boolean {
  const side = String(row.side ?? row.pick ?? row.direction ?? "").toLowerCase();
  return side === "buy" || side === "yes" || side === "long" || side === "bullish" || side === "call";
}

function isBearish(row: Record<string, unknown>): boolean {
  const side = String(row.side ?? row.pick ?? row.direction ?? "").toLowerCase();
  return side === "sell" || side === "no" || side === "short" || side === "bearish" || side === "put";
}

function noteVolOi(note: string, seed: number): number {
  const m = note.match(/Vol\/OI\s+([\d.]+)x/i);
  if (m) return Number(m[1]);
  return Number((8 + (seed % 12) + (seed % 10) / 10).toFixed(1));
}

export function buildAssetDeepDive(
  row: Record<string, unknown>,
  module: BrandModuleId
): AssetDeepDivePayload {
  const seed = rowSeed(row);
  const brand = MODULE_BRAND[module];
  const bullish = isBullish(row);
  const bearish = isBearish(row);
  const statusVariant: AssetDeepDivePayload["statusVariant"] = bullish
    ? "bullish"
    : bearish
      ? "bearish"
      : "neutral";
  const statusBadge =
    bullish ? "MORE BULLISH CONTEXT" : bearish ? "MORE CAUTIOUS CONTEXT" : "MIXED CONTEXT";
  // Differentiated attention score per symbol (still heuristic — not a live quote)
  const confidence = 55 + (seed % 38);

  const chartDesc =
    module === "betting"
      ? "Recent line context (illustrative)"
      : module === "predictions"
        ? "Probability path · last day (illustrative)"
        : "Price context · recent session (illustrative)";

  const baseMeta = {
    timestamp: formatTime(row.timestamp ?? row.created_at),
    moduleLabel: `${brand.name.toUpperCase()} DESK`,
    statusBadge,
    statusVariant,
    confidence,
    chartDesc,
  };

  switch (module) {
    case "trades":
    case "pinkslips": {
      const sym = String(row.symbol ?? "—");
      const price = row.price != null ? formatPrice(row.price) : "—";
      const volOi = noteVolOi(String(row.note ?? row.briefingNote ?? ""), seed);
      const changePct =
        row.changePct != null
          ? Number(row.changePct)
          : row.change_pct != null
            ? Number(row.change_pct)
            : undefined;
      const volRatio = row.volRatio != null ? Number(row.volRatio) : undefined;
      const premium = row.premium != null ? Number(row.premium) : undefined;
      const clarityMod = module === "pinkslips" ? "pinkslips" : "trades";
      const brief = buildPlainBrief({
        module: clarityMod,
        symbol: sym,
        type: String(row.type ?? row.optionType ?? (bullish ? "call" : bearish ? "put" : "")),
        volOiRatio: module === "trades" ? volOi : undefined,
        volRatio,
        changePct,
        premium,
        note: String(row.note ?? row.briefingNote ?? ""),
        existingNote: String(row.note ?? row.briefingNote ?? ""),
        side: String(row.side ?? ""),
        actorType: String(row.actorType ?? ""),
        seed,
        statusVariant,
        priceLabel: price,
        sharesLabel:
          row.shares != null
            ? `${formatShares(row.shares)} shares`
            : row.amount != null
              ? formatUsd(row.amount)
              : undefined,
      });

      return {
        ...baseMeta,
        title: `$${sym}`,
        linkSymbol: sym !== "—" ? sym : undefined,
        linkQuery: sym !== "—" ? sym : undefined,
        kpis: [
          { label: "Your reference price", value: price, hint: "From holdings or last feed print" },
          {
            label: module === "trades" ? "Unusual options activity" : "Volume vs average",
            value: module === "trades" ? `${volOi}x` : volRatio != null ? `${volRatio}x` : `${(2 + (seed % 5) + 0.1).toFixed(1)}x`,
            hint: module === "trades" ? "Vol/OI — options volume vs open interest" : "How busy trading is vs recent days",
            highlight: true,
          },
          {
            label: module === "trades" ? "Size in view" : "Session move",
            value:
              module === "trades"
                ? formatShares(row.shares)
                : changePct != null
                  ? `${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`
                  : formatShares(row.shares),
          },
          {
            label: "Desk lean",
            value: bullish ? "Supportive" : bearish ? "Cautious" : "Mixed",
            hint: "Attention lean — not a trade instruction",
            highlight: true,
          },
        ],
        chartPoints: generateMicroSeries(seed, Number(row.price) || 100 + (seed % 40), 14),
        aiAdvice: brief.aiAdvice,
        plainSummary: brief.plainSummary,
        whatItMeans: brief.whatItMeans,
        whatToWatch: brief.whatToWatch,
        signalStack: brief.signalStack,
        stanceExplain: stancePlainExplain(statusVariant === "bullish" ? "would_hold" : statusVariant === "bearish" ? "would_avoid" : "hold"),
        scorecard: buildMotiveScorecard(
          {
            ...row,
            symbol: sym,
            price: row.price,
            note: String(row.note ?? row.briefingNote ?? ""),
          },
          module === "pinkslips" ? "pinkslips" : "trades"
        ),
      };
    }
    case "crypto": {
      const asset = String(row.asset ?? row.symbol ?? "—");
      const brief = buildPlainBrief({
        module: "crypto",
        symbol: asset,
        amountUsd: row.amountUsd != null ? Number(row.amountUsd) : undefined,
        direction: String(row.direction ?? row.side ?? ""),
        note: String(row.note ?? ""),
        existingNote: String(row.note ?? ""),
        seed,
        statusVariant,
        priceLabel: row.price != null ? formatPrice(row.price) : undefined,
      });
      return {
        ...baseMeta,
        title: `${asset}`,
        linkSymbol: asset !== "—" ? asset : undefined,
        linkQuery: asset !== "—" ? asset : undefined,
        kpis: [
          { label: "Spot reference", value: formatPrice(row.price) },
          {
            label: "Network activity",
            value: `${(1.2 + (seed % 80) / 10).toFixed(1)}x`,
            hint: "Relative gas / network load (illustrative)",
            highlight: true,
          },
          { label: "Transfer size", value: formatUsd(row.amountUsd) },
          {
            label: "Flow direction",
            value: String(row.direction ?? row.side ?? "—").toUpperCase(),
            hint: "Where the coins appear to be moving",
            highlight: true,
          },
        ],
        chartPoints: generateMicroSeries(seed, Number(row.price) || 42000, 14),
        aiAdvice: brief.aiAdvice,
        plainSummary: brief.plainSummary,
        whatItMeans: brief.whatItMeans,
        whatToWatch: brief.whatToWatch,
        signalStack: brief.signalStack,
        stanceExplain: "Large transfers are volatility context — not buy/sell instructions.",
        scorecard: buildMotiveScorecard(
          { ...row, symbol: asset, asset, amountUsd: row.amountUsd, direction: row.direction ?? row.side },
          "crypto"
        ),
      };
    }
    case "betting": {
      const matchup = String(row.matchup ?? row.market ?? "—");
      const brief = buildPlainBrief({
        module: "betting",
        symbol: matchup.slice(0, 32),
        note: String(row.note ?? ""),
        existingNote: String(row.note ?? ""),
        seed,
        statusVariant,
      });
      return {
        ...baseMeta,
        title: matchup,
        linkQuery: matchup !== "—" ? matchup : undefined,
        kpis: [
          { label: "Line / odds", value: String(row.odds ?? row.line ?? "—") },
          {
            label: "Line movement",
            value: `${(seed % 12) + 3}.${seed % 10} pts`,
            hint: "How far the number has shifted",
            highlight: true,
          },
          { label: "Stake in view", value: formatUsd(row.stake ?? row.amountUsd) },
          {
            label: "Side in focus",
            value: String(row.pick ?? row.side ?? "—").toUpperCase(),
            highlight: true,
          },
        ],
        chartPoints: generateMicroSeries(seed, 50 + (seed % 30), 12),
        aiAdvice: brief.aiAdvice,
        plainSummary: brief.plainSummary,
        whatItMeans: brief.whatItMeans,
        whatToWatch: brief.whatToWatch,
        signalStack: brief.signalStack,
        stanceExplain: "Odds intel only — MotiveFX does not place bets.",
        scorecard: buildMotiveScorecard(
          { ...row, matchup, symbol: matchup, odds: row.odds ?? row.line, line: row.line },
          "betting"
        ),
      };
    }
    case "predictions":
    default: {
      const market = String(row.market ?? row.symbol ?? "—");
      const yesPct =
        row.yesPrice != null
          ? Math.round(Number(row.yesPrice) * 100)
          : row.yes != null
            ? Math.round(Number(row.yes) * 100)
            : undefined;
      const yesLabel = yesPct != null ? `${yesPct}%` : "—";
      const brief = buildPlainBrief({
        module: "predictions",
        symbol: market.slice(0, 32),
        yesPct,
        note: String(row.note ?? ""),
        existingNote: String(row.note ?? ""),
        seed,
        statusVariant,
      });
      return {
        ...baseMeta,
        title: market.length > 48 ? `${market.slice(0, 48)}…` : market,
        linkQuery: market !== "—" ? market : undefined,
        linkSymbol: undefined,
        kpis: [
          { label: "Implied yes price", value: yesLabel, hint: "Crowd odds on this contract" },
          {
            label: "Recent odds swing",
            value: `${bullish ? "+" : "-"}${(seed % 9) + 2}.${seed % 10}%`,
            highlight: true,
          },
          { label: "Position stake", value: formatUsd(row.stake) },
          { label: "Market activity", value: `${row.marketBetCount ?? "—"} bets` },
        ],
        chartPoints: generateMicroSeries(seed, Number(row.yesPrice ?? row.yes ?? 0.5) * 100, 14),
        aiAdvice: brief.aiAdvice,
        plainSummary: brief.plainSummary,
        whatItMeans: brief.whatItMeans,
        whatToWatch: brief.whatToWatch,
        signalStack: brief.signalStack,
        stanceExplain: "Crowd odds are a temperature check — not a forecast or recommendation.",
        scorecard: buildMotiveScorecard(
          {
            ...row,
            market,
            symbol: market,
            yesPrice: row.yesPrice ?? row.yes,
            yes: row.yes ?? row.yesPrice,
          },
          "predictions"
        ),
      };
    }
  }
}
