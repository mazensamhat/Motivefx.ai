import { prisma } from "@motivefx/database";
import { countBets, addBet } from "./bets";
import { countPredictions, addPrediction } from "./predictions";
import { loadPortfolio, savePortfolio } from "./portfolio";

const DEMO_STOCKS = [
  { symbol: "NVDA", shares: 10, avg_cost: 800 },
  { symbol: "AAPL", shares: 25, avg_cost: 175 },
  { symbol: "TSLA", shares: 15, avg_cost: 220 },
  { symbol: "MSFT", shares: 12, avg_cost: 380 },
];

const DEMO_CRYPTO = [
  { symbol: "BTC", amount: 0.42, avg_cost: 62000 },
  { symbol: "ETH", amount: 3.5, avg_cost: 2800 },
  { symbol: "SOL", amount: 120, avg_cost: 145 },
];

const DEMO_PENNY = [
  { symbol: "SNDL", shares: 5000, avg_cost: 0.38 },
  { symbol: "AMC", shares: 800, avg_cost: 4.2 },
  { symbol: "OPEN", shares: 3000, avg_cost: 1.85 },
  { symbol: "BNGO", shares: 2500, avg_cost: 1.1 },
];

const DEMO_BETS = [
  { matchup: "Chiefs @ Bills", pick: "Bills +4.5", odds: "-110", stake: 250, sport: "football" },
  { matchup: "Lakers @ Celtics", pick: "Celtics -4", odds: "-115", stake: 100, sport: "basketball" },
  { matchup: "Dodgers @ Padres", pick: "Padres +1.5", odds: "+120", stake: 75, sport: "baseball" },
  { matchup: "Yankees @ Red Sox", pick: "Yankees -1.5", odds: "-105", stake: 50, sport: "baseball" },
];

const DEMO_PREDICTIONS = [
  { market: "Ceasefire in Ukraine before Dec 2026?", category: "geopolitics", pick: "No", stake: 200, yes_price: 0.34 },
  { market: "Taylor Swift announces engagement in 2026?", category: "entertainment", pick: "Yes", stake: 75, yes_price: 0.41 },
  { market: "Fed cuts rates 3+ times in 2026?", category: "economy", pick: "Yes", stake: 150, yes_price: 0.55 },
];

async function portfolioEmpty(userId: string, module: "trades" | "crypto" | "penny") {
  const holdings = await loadPortfolio(userId, module);
  return holdings.length === 0;
}

export async function seedDemoUser(userId: string, force = false) {
  const seeded: string[] = [];

  if (force || (await portfolioEmpty(userId, "trades"))) {
    await savePortfolio(userId, "trades", DEMO_STOCKS);
    seeded.push("trades");
  }
  if (force || (await portfolioEmpty(userId, "crypto"))) {
    await savePortfolio(userId, "crypto", DEMO_CRYPTO);
    seeded.push("crypto");
  }
  if (force || (await portfolioEmpty(userId, "penny"))) {
    await savePortfolio(userId, "penny", DEMO_PENNY);
    seeded.push("penny");
  }

  const betCount = await countBets(userId);
  if (force || betCount === 0) {
    if (force && betCount > 0) {
      await prisma.userBet.deleteMany({ where: { userId } });
    }
    for (const b of DEMO_BETS) {
      await addBet(userId, b);
    }
    seeded.push("betting");
  }

  const predCount = await countPredictions(userId);
  if (force || predCount === 0) {
    if (force && predCount > 0) {
      await prisma.userPrediction.deleteMany({ where: { userId } });
    }
    for (const p of DEMO_PREDICTIONS) {
      await addPrediction(userId, {
        market: p.market,
        category: p.category,
        pick: p.pick,
        stake: p.stake,
        yesPrice: p.yes_price,
      });
    }
    seeded.push("predictions");
  }

  return {
    seeded: seeded.length ? seeded : ["already_exists"],
    stocks: DEMO_STOCKS,
    crypto: DEMO_CRYPTO,
    penny: DEMO_PENNY,
    bets: DEMO_BETS,
    predictions: DEMO_PREDICTIONS,
  };
}

export async function demoStatus(userId: string) {
  const [stocks, crypto, penny, bets] = await Promise.all([
    loadPortfolio(userId, "trades"),
    loadPortfolio(userId, "crypto"),
    loadPortfolio(userId, "penny"),
    countBets(userId),
  ]);
  return {
    has_stocks: stocks.length > 0,
    has_crypto: crypto.length > 0,
    has_penny: penny.length > 0,
    has_bets: bets > 0,
    stock_count: stocks.length,
    crypto_count: crypto.length,
    penny_count: penny.length,
    bet_count: bets,
  };
}
