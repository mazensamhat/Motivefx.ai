import { beforeEach, describe, expect, it, vi } from "vitest";

const userBet = vi.hoisted(() => ({
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  count: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@motivefx/database", () => ({
  prisma: {
    userBet,
  },
}));

import { addBet, listBets } from "./bets";

describe("terminal bets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deduplicates open bets by sportsbook identity", async () => {
    userBet.findFirst.mockResolvedValueOnce({ id: "existing-bet" });

    await expect(
      addBet("user-1", {
        matchup: " Chiefs vs Eagles ",
        pick: " Over 47.5 ",
        odds: "-110",
        sportsbook: " DraftKings ",
        stake: 10,
        sport: "football",
        isSimulation: true,
      })
    ).resolves.toBe("existing-bet");

    expect(userBet.findFirst).toHaveBeenCalledWith({
      where: {
        userId: "user-1",
        matchup: { equals: "Chiefs vs Eagles", mode: "insensitive" },
        pick: { equals: "Over 47.5", mode: "insensitive" },
        sportsbook: { equals: "DraftKings", mode: "insensitive" },
        status: "open",
        isSimulation: true,
      },
      select: { id: true },
    });
    expect(userBet.create).not.toHaveBeenCalled();
  });

  it("treats sportsbook-less bets as a separate null sportsbook identity", async () => {
    userBet.findFirst.mockResolvedValueOnce(null);
    userBet.create.mockResolvedValueOnce({ id: "created-bet" });

    await expect(
      addBet("user-1", {
        matchup: "Lakers vs Celtics",
        pick: "Lakers ML",
        sportsbook: "   ",
      })
    ).resolves.toBe("created-bet");

    expect(userBet.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sportsbook: null,
          isSimulation: false,
        }),
      })
    );
    expect(userBet.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        matchup: "Lakers vs Celtics",
        pick: "Lakers ML",
        odds: null,
        sportsbook: null,
        stake: null,
        sport: "other",
        isSimulation: false,
      },
    });
  });

  it("serializes sportsbook on listed bets", async () => {
    const createdAt = new Date("2026-10-01T08:00:00.000Z");
    const settledAt = new Date("2026-10-01T09:15:00.000Z");
    userBet.findMany.mockResolvedValueOnce([
      {
        id: "bet-1",
        matchup: "Mets vs Braves",
        pick: "Mets ML",
        odds: "+120",
        sportsbook: "FanDuel",
        stake: 25,
        sport: "baseball",
        status: "settled",
        isSimulation: false,
        outcome: "win",
        pnl: 30,
        settledAt,
        createdAt,
      },
    ]);

    await expect(listBets("user-1")).resolves.toEqual([
      {
        id: "bet-1",
        matchup: "Mets vs Braves",
        pick: "Mets ML",
        odds: "+120",
        sportsbook: "FanDuel",
        stake: 25,
        sport: "baseball",
        status: "settled",
        is_simulation: false,
        outcome: "win",
        pnl: 30,
        settled_at: "2026-10-01T09:15:00.000Z",
        created_at: "2026-10-01T08:00:00.000Z",
      },
    ]);
    expect(userBet.findMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "desc" },
    });
  });
});
