import { json } from "@/lib/api";
import { moduleAccessResponse, resolveAccess } from "@/lib/terminal/request-access";
import {
  fetchLineMovesWithMeta,
  fetchSharpActionWithMeta,
  mapLineMovesToMarketActivity,
  summarizeMarketActivity,
} from "@/lib/terminal/feeds";

export const dynamic = "force-dynamic";

function routeSportToFeedSport(sport: string): string {
  const key = sport.trim().toLowerCase();
  const aliases: Record<string, string> = {
    football: "americanfootball_nfl",
    basketball: "basketball_nba",
    baseball: "baseball_mlb",
    hockey: "icehockey_nhl",
    soccer: "soccer_usa_mls",
    mma: "mma_mixed_martial_arts",
    tennis: "tennis_atp",
  };
  return aliases[key] ?? (key || "all");
}

export async function GET(request: Request) {
  try {
    await resolveAccess(request, "betting");
    const url = new URL(request.url);
    const sportFilter = (url.searchParams.get("sport") ?? "").trim().toLowerCase();
    const feedSport = routeSportToFeedSport(sportFilter);
    const matchupFilter = (url.searchParams.get("matchup") ?? "").trim().toLowerCase();
    const minBets = Number(url.searchParams.get("min_bets") ?? 0);

    const [board, sharp] = await Promise.all([
      fetchLineMovesWithMeta(feedSport),
      fetchSharpActionWithMeta(feedSport),
    ]);

    let items = mapLineMovesToMarketActivity(board.items);
    if (sportFilter) {
      items = items.filter((r) => {
        const blob = `${r.sport} ${r.sportKey ?? ""} ${r.sportLabel}`.toLowerCase();
        const keyMap: Record<string, string[]> = {
          football: ["nfl", "ncaaf", "football"],
          basketball: ["nba", "wnba", "ncaab", "basketball"],
          baseball: ["mlb", "baseball"],
          hockey: ["nhl", "hockey"],
          soccer: ["soccer", "mls", "epl"],
          mma: ["mma", "ufc"],
          tennis: ["tennis"],
        };
        const needles = keyMap[sportFilter] ?? [sportFilter];
        return needles.some((n) => blob.includes(n));
      });
    }
    if (matchupFilter) {
      items = items.filter((r) => r.matchup.toLowerCase().includes(matchupFilter));
    }
    if (Number.isFinite(minBets) && minBets > 0) {
      const counts = new Map<string, number>();
      for (const r of items) {
        counts.set(r.matchup, (counts.get(r.matchup) ?? 0) + 1);
      }
      items = items.filter((r) => (counts.get(r.matchup) ?? 0) >= minBets);
    }

    const summaries = summarizeMarketActivity(items, sharp.items).filter((s) =>
      Number.isFinite(minBets) && minBets > 0 ? s.betCount >= minBets : true
    );

    return json({
      items,
      summaries,
      count: items.length,
      source: board.source,
      provider: board.provider ?? null,
      sharpError: sharp.error ?? null,
      derivedNote: sharp.derivedNote ?? null,
    });
  } catch (err) {
    return moduleAccessResponse(err);
  }
}
