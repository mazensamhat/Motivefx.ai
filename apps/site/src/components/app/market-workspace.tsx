"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import { Check, Loader2, Lock, Plus, Unlock } from "lucide-react";

import type { IntelligenceMarketId } from "@/lib/tiers";

import {

  previewSignals,

  userHasLiveMarketAccess,

  type AppMarketSlug,

} from "@/lib/entitlements";



const ACTIVITY_PATH: Partial<Record<AppMarketSlug, string>> = {

  stocks: "/api/stocks/activity",

  crypto: "/api/crypto/activity",

  sports: "/api/betting/activity",

  "pink-slips": "/api/penny/activity",

  predictions: "/api/predictions/activity",

  options: "/api/stocks/unusual-options",

};



export function MarketWorkspace({

  slug,

  label,

  description,

  marketId,

  tier,

  markets,

  hasSubscription,

  userId,

}: {

  slug: AppMarketSlug;

  label: string;

  description: string;

  marketId: IntelligenceMarketId | "options";

  tier: string;

  markets: IntelligenceMarketId[];

  hasSubscription: boolean;

  userId: string | null;

}) {

  const live = userHasLiveMarketAccess(tier, markets, marketId, hasSubscription);

  const [feed, setFeed] = useState<{ symbol?: string; title?: string; confidence?: number }[]>([]);

  const [feedError, setFeedError] = useState("");
  const [savingKey, setSavingKey] = useState("");
  const [savedKeys, setSavedKeys] = useState<Set<string>>(() => new Set());
  const [saveError, setSaveError] = useState("");



  useEffect(() => {

    const path = ACTIVITY_PATH[slug];

    if (!path || !userId || !live) {

      setFeed([]);

      return;

    }

    const uid = encodeURIComponent(userId);

    fetch(`${path}?user_id=${uid}&limit=8`)

      .then(async (res) => {

        if (!res.ok) {

          const data = (await res.json().catch(() => ({}))) as { detail?: string };

          throw new Error(data.detail ?? `Feed unavailable (${res.status})`);

        }

        return res.json() as Promise<{ items?: Record<string, unknown>[] }>;

      })

      .then((data) => {

        const items = (data.items ?? []).map((row) => ({

          symbol: String(row.symbol ?? row.ticker ?? row.matchup ?? row.market ?? "—"),

          title: String(row.title ?? row.note ?? row.summary ?? row.type ?? "Signal"),

          confidence: Number(row.confidence ?? row.score ?? row.signal ?? 0) || undefined,

        }));

        setFeed(items);

        setFeedError("");

      })

      .catch((err: Error) => {

        setFeed([]);

        setFeedError(err.message);

      });

  }, [slug, userId, live]);



  const portfolioKind = slug === "stocks" || slug === "options"
    ? "trades"
    : slug === "crypto"
      ? "crypto"
      : slug === "pink-slips"
        ? "penny"
        : slug === "sports"
          ? "betting"
          : slug === "predictions"
            ? "predictions"
            : null;

  const savedKey = (symbol: string) => symbol.trim().toUpperCase();

  async function addToPortfolio(row: { symbol: string; signal: number; note: string }) {
    if (!userId || !portfolioKind || !live) return;
    const key = savedKey(row.symbol);
    setSavingKey(key);
    setSaveError("");
    try {
      const res = await fetch("/api/terminal/portfolio/add", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          kind: portfolioKind,
          symbol: row.symbol,
          title: row.note,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { detail?: string };
      if (!res.ok) throw new Error(data.detail ?? `Unable to add (${res.status})`);
      setSavedKeys((prev) => new Set(prev).add(key));
      window.dispatchEvent(new CustomEvent("motivefx:portfolio-changed", { detail: { kind: portfolioKind } }));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to add to portfolio.");
    } finally {
      setSavingKey("");
    }
  }

  useEffect(() => {
    if (!userId || !portfolioKind || !live) {
      setSavedKeys(new Set());
      return;
    }
    if (portfolioKind === "betting" || portfolioKind === "predictions") {
      setSavedKeys(new Set());
      return;
    }
    const modulePath = portfolioKind === "penny" ? "penny" : portfolioKind;
    const loadSaved = () => {
      fetch(`/api/advisor/${modulePath}/portfolio/${encodeURIComponent(userId)}?user_id=${encodeURIComponent(userId)}`)
        .then((res) => res.ok ? res.json() : Promise.reject(new Error("Portfolio unavailable")))
        .then((data: { holdings?: Array<{ symbol: string }> }) =>
          setSavedKeys(new Set((data.holdings ?? []).map((h) => savedKey(h.symbol))))
        )
        .catch(() => {});
    };
    loadSaved();
    const onPortfolioChanged = (event: Event) => {
      if ((event as CustomEvent<{ kind?: string }>).detail?.kind === portfolioKind) loadSaved();
    };
    window.addEventListener("motivefx:portfolio-changed", onPortfolioChanged);
    return () => window.removeEventListener("motivefx:portfolio-changed", onPortfolioChanged);
  }, [userId, portfolioKind, live]);

  const signals =

    feed.length > 0

      ? feed.map((r) => ({

          symbol: r.symbol ?? "—",

          signal: r.confidence ?? 70,

          note: r.title ?? "",

        }))

      : previewSignals(slug);



  return (

    <div className="space-y-6">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

        <div>

          <Link href="/app" className="text-sm text-[#00e676] hover:underline">

            ← Terminal

          </Link>

          <h1 className="mt-2 text-2xl font-bold text-white">{label}</h1>

          <p className="mt-1 text-sm text-slate-400">{description}</p>

        </div>

        <span className={`app-access-pill ${live ? "app-access-pill-live" : "app-access-pill-preview"}`}>

          {live ? (

            <>

              <Unlock className="h-4 w-4" /> Live access

            </>

          ) : (

            <>

              <Lock className="h-4 w-4" /> Preview mode

            </>

          )}

        </span>

      </div>



      {!live && (

        <section className="app-upgrade-banner">

          <div>

            <p className="font-semibold text-white">

              {hasSubscription ? "This market is not on your plan" : "Subscribe for live feeds"}

            </p>

            <p className="mt-1 text-sm text-slate-400">

              {feedError || "Showing sample signals until your plan includes this market."}

            </p>

          </div>

          <Link href="/pricing" className="app-cta-btn">

            View plans

          </Link>

        </section>

      )}



      <section className="app-panel">

        <h2 className="font-semibold text-white">Motive Signal radar</h2>

        <p className="mt-1 text-sm text-slate-400">

          {feed.length > 0 ? "Live feed from MotiveFX." : "Sample signals (live feed or plan required)."}

        </p>

        {saveError && <p className="mt-3 text-sm text-red-300">{saveError}</p>}
        <ul className="mt-4 space-y-3">

          {signals.map((row, i) => (

            <li key={`${row.symbol}-${i}`} className="app-signal-row">

              <div>

                <p className="font-semibold text-white">{row.symbol}</p>

                <p className="text-sm text-slate-400">{row.note}</p>

              </div>

              <div className="flex items-center gap-2">
                <span className="app-signal-pill text-base">{row.signal}</span>
                {portfolioKind && userId && live && (() => {
                  const key = savedKey(row.symbol);
                  const saved = savedKeys.has(key);
                  const saving = savingKey === key;
                  return (
                    <button
                      type="button"
                      onClick={() => addToPortfolio(row)}
                      disabled={saving || saved}
                      className="app-cta-btn inline-flex items-center gap-1.5 disabled:cursor-default disabled:opacity-70"
                      aria-label={saved ? `${row.symbol} added to portfolio` : `Add ${row.symbol} to portfolio`}
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {saved ? "Added" : "Add"}
                    </button>
                  );
                })()}
              </div>

            </li>

          ))}

        </ul>

      </section>

    </div>

  );

}

