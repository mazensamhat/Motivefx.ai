import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";

const state = { row: null, rows: [], unavailable: false, saved: 0, strict: false };
const db = {
  userPortfolio: {
    findUnique: async () => state.row,
    findMany: async () => state.rows,
  },
};
globalThis.__portfolioSafetyDb = db;
globalThis.__portfolioSafetyPrefs = {
  getIntelPrefs: async (_id, options = {}) => {
    state.strict = options.strict === true;
    if (state.unavailable) throw new Error("preference read timed out");
    return {};
  },
  saveIntelPrefs: async () => { state.saved++; },
};

let source = await readFile(new URL("../apps/site/src/lib/terminal/portfolio.ts", import.meta.url), "utf8");
source = source
  .replace('import { prisma } from "@motivefx/database";', "const prisma = globalThis.__portfolioSafetyDb;")
  .replace('import { getIntelPrefs, saveIntelPrefs } from "@/lib/terminal/intel-prefs";', "const { getIntelPrefs, saveIntelPrefs } = globalThis.__portfolioSafetyPrefs;");
const code = stripTypeScriptTypes(source);
const { loadPortfolio, countAllHoldings, portfolioSnapshot, listPortfolioBooks } =
  await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));

function reset() {
  state.row = null;
  state.rows = [];
  state.unavailable = false;
  state.saved = 0;
  state.strict = false;
}

test("absent portfolio is legitimately empty; stored array is preserved", async () => {
  reset();
  assert.deepEqual(await loadPortfolio("u", "crypto"), []);
  state.row = { holdingsJson: '[{"symbol":"BTC","shares":2}]' };
  assert.deepEqual(await loadPortfolio("u", "crypto"), [{ symbol: "BTC", shares: 2 }]);
});

test("unreadable existing portfolio never becomes empty", async () => {
  reset();
  for (const raw of ["not-json", "{}", "null", '"empty"']) {
    state.row = { holdingsJson: raw };
    await assert.rejects(loadPortfolio("u", "crypto"), /Saved portfolio is unavailable/);
  }
});

test("tracked holding count does not silently hide unreadable records", async () => {
  reset();
  state.rows = [{ module: "crypto", holdingsJson: "not-json" }];
  await assert.rejects(countAllHoldings("u"), /Saved portfolio is unavailable/);
  await assert.rejects(portfolioSnapshot("u"), /Saved portfolio is unavailable/);
});

test("portfolio book defaults must not be saved when prefs are unavailable", async () => {
  reset();
  state.unavailable = true;
  await assert.rejects(listPortfolioBooks("u", "crypto"), /preference read timed out/);
  assert.equal(state.strict, true);
  assert.equal(state.saved, 0);
});
