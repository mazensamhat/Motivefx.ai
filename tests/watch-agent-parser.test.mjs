import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
const source = stripTypeScriptTypes(await readFile(new URL("../web/src/lib/watchAgentParser.ts", import.meta.url), "utf8"));
const { parseWatchAgentDraft } = await import("data:text/javascript;base64," + Buffer.from(source).toString("base64"));

test("plain-English Motive Signal below rule", () => {
  assert.deepEqual(parseWatchAgentDraft("Watch BTC if Motive Signal falls below 45"), {
    name: "Watch BTC if Motive Signal falls below 45", symbol: "BTC", metric: "signal", operator: "below", threshold: 45,
  });
});
test("confidence rule", () => {
  const value = parseWatchAgentDraft("Monitor NVDA if evidence confidence goes above 80");
  assert.equal(value?.symbol, "NVDA"); assert.equal(value?.metric, "confidence"); assert.equal(value?.operator, "above"); assert.equal(value?.threshold, 80);
});
test("signal-change rule", () => {
  const value = parseWatchAgentDraft("Track ETH if signal change moves by more than 12");
  assert.equal(value?.metric, "signal_change"); assert.equal(value?.operator, "above"); assert.equal(value?.threshold, 12);
});
test("vague request does not invent threshold", () => assert.equal(parseWatchAgentDraft("Watch BTC closely"), null));
