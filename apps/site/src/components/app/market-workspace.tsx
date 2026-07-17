"use client";



import Link from "next/link";

import { useEffect, useState } from "react";

import { Lock, Unlock } from "lucide-react";

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

        <ul className="mt-4 space-y-3">

          {signals.map((row, i) => (

            <li key={`${row.symbol}-${i}`} className="app-signal-row">

              <div>

                <p className="font-semibold text-white">{row.symbol}</p>

                <p className="text-sm text-slate-400">{row.note}</p>

              </div>

              <span className="app-signal-pill text-base">{row.signal}</span>

            </li>

          ))}

        </ul>

      </section>

    </div>

  );

}

