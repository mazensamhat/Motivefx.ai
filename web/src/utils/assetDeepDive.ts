import type { BrandModuleId } from "../brand/moduleBrand";
import { MODULE_BRAND } from "../brand/moduleBrand";
import { formatTime, formatUsd, formatShares, formatPrice } from "./formatActivity";
import { generateMicroSeries, hashSeed } from "./sparkline";

export interface DeepDiveKpi {
  label: string;
  value: string;
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
  aiAdvice: string;
  confidence: number;
  /** Symbol or ticker for broker deep-links */
  linkSymbol?: string;
  /** Search query (market name, matchup) for platform search */
  linkQuery?: string;
}

function rowSeed(row: Record<string, unknown>): number {
  return hashSeed(String(row.id ?? row.symbol ?? row.market ?? row.matchup ?? "row"));
}

function isBullish(row: Record<string, unknown>): boolean {
  const side = String(row.side ?? row.pick ?? row.direction ?? "").toLowerCase();
  return side === "buy" || side === "yes" || side === "long" || side === "bullish";
}

function isBearish(row: Record<string, unknown>): boolean {
  const side = String(row.side ?? row.pick ?? row.direction ?? "").toLowerCase();
  return side === "sell" || side === "no" || side === "short" || side === "bearish";
}

export function buildAssetDeepDive(
  row: Record<string, unknown>,
  module: BrandModuleId
): AssetDeepDivePayload {
  const seed = rowSeed(row);
  const brand = MODULE_BRAND[module];
  const bullish = isBullish(row);
  const bearish = isBearish(row);
  const statusVariant = bullish ? "bullish" : bearish ? "bearish" : "neutral";
  const statusBadge = bullish ? "BULLISH SENTIMENT" : bearish ? "BEARISH SENTIMENT" : "NEUTRAL TREND";
  const confidence = 62 + (seed % 33);

  const basePayload = {
    timestamp: formatTime(row.timestamp ?? row.created_at),
    moduleLabel: `${brand.name.toUpperCase()} MODULE`,
    statusBadge,
    statusVariant: statusVariant as AssetDeepDivePayload["statusVariant"],
    confidence,
    chartDesc: module === "betting" ? "12-hour line skew interval" : module === "predictions" ? "Probability path · 24h" : "10-hour index interval",
  };

  switch (module) {
    case "trades":
    case "pinkslips": {
      const sym = String(row.symbol ?? "—");
      const price = row.price != null ? formatPrice(row.price) : "—";
      const volOi = noteVolOi(String(row.note ?? ""));
      return {
        ...basePayload,
        title: `$${sym} ${row.actorType === "institutional" ? "Block" : "Flow"}`,
        linkSymbol: sym !== "—" ? sym : undefined,
        linkQuery: sym !== "—" ? sym : undefined,
        kpis: [
          { label: "Current Price", value: price },
          { label: "Vol / OI Ratio", value: volOi, highlight: true },
          { label: "Block Size", value: formatShares(row.shares) },
          { label: "Desk Position", value: String(row.side ?? "—").toUpperCase(), highlight: true },
        ],
        chartPoints: generateMicroSeries(seed, Number(row.price) || 100, 14),
        aiAdvice:
          String(row.note ?? "") ||
          "Algorithmic confirmation metrics align on this active support frame. Vol/OI expansion suggests institutional accumulation ahead of catalyst window.",
      };
    }
    case "crypto": {
      const asset = String(row.asset ?? row.symbol ?? "—");
      return {
        ...basePayload,
        title: `${asset} Whale Flow`,
        linkSymbol: asset !== "—" ? asset : undefined,
        linkQuery: asset !== "—" ? asset : undefined,
        kpis: [
          { label: "Spot Reference", value: formatPrice(row.price) },
          { label: "Network Gas Spike", value: `${(1.2 + (seed % 80) / 10).toFixed(1)}x`, highlight: true },
          { label: "Transfer Size", value: formatUsd(row.amountUsd) },
          { label: "Flow Direction", value: String(row.direction ?? row.side ?? "—").toUpperCase(), highlight: true },
        ],
        chartPoints: generateMicroSeries(seed, Number(row.price) || 42000, 14),
        aiAdvice:
          String(row.note ?? "") ||
          "On-chain cluster analysis flags coordinated wallet rotation. Exchange outflow ratio supports localized accumulation thesis.",
      };
    }
    case "betting": {
      const matchup = String(row.matchup ?? row.market ?? "—");
      return {
        ...basePayload,
        title: matchup,
        linkQuery: matchup !== "—" ? matchup : undefined,
        kpis: [
          { label: "Line / Odds", value: String(row.odds ?? row.line ?? "—") },
          { label: "Sharp Line Skew", value: `${(seed % 12) + 3}.${seed % 10} pts`, highlight: true },
          { label: "Market Stake", value: formatUsd(row.stake ?? row.amountUsd) },
          { label: "Pick Side", value: String(row.pick ?? row.side ?? "—").toUpperCase(), highlight: true },
        ],
        chartPoints: generateMicroSeries(seed, 50 + (seed % 30), 12),
        aiAdvice:
          String(row.note ?? "") ||
          "Sharp desk money diverges from public ticket count. Line movement suggests contrarian value on the underdog side within moderate sizing bounds.",
      };
    }
    case "predictions":
    default: {
      const market = String(row.market ?? "—");
      const yesPct = row.yesPrice != null ? `${(Number(row.yesPrice) * 100).toFixed(0)}%` : "—";
      return {
        ...basePayload,
        title: market.length > 48 ? `${market.slice(0, 48)}…` : market,
        linkQuery: market !== "—" ? market : undefined,
        kpis: [
          { label: "Binary YES Price", value: yesPct },
          { label: "Event Probability Δ", value: `${bullish ? "+" : "-"}${(seed % 9) + 2}.${seed % 10}%`, highlight: true },
          { label: "Position Stake", value: formatUsd(row.stake) },
          { label: "Market Depth", value: `${row.marketBetCount ?? "—"} bets` },
        ],
        chartPoints: generateMicroSeries(seed, Number(row.yesPrice ?? 0.5) * 100, 14),
        aiAdvice:
          String(row.note ?? "") ||
          "System cross-references geopolitical contract flow with sentiment stabilization indices. Probability path favors confirmation before execution vectors.",
      };
    }
  }
}

function noteVolOi(note: string): string {
  const m = note.match(/Vol\/OI\s+([\d.]+)x/i);
  if (m) return `${m[1]}x`;
  return `${(8 + (note.length % 12)).toFixed(1)}x`;
}
