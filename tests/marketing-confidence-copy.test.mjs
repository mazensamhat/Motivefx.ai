import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";

const files = {
  opportunityPage: "../apps/site/src/app/opportunity-radar/page.tsx",
  opportunityBoard: "../apps/site/src/components/marketing/opportunity-radar-board.tsx",
  signalEngine: "../apps/site/src/components/marketing/signal-engine-section.tsx",
  marketingCopy: "../apps/site/src/lib/marketing-copy.ts",
  modules: "../apps/site/src/content/modules/index.ts",
};

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(files).map(async ([key, relative]) => [
      key,
      await readFile(new URL(relative, import.meta.url), "utf8"),
    ])
  )
);

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `Expected ${name} to exist`);
  const braceStart = source.indexOf("{", start);
  let depth = 0;
  for (let i = braceStart; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

test("opportunity radar never labels illustrative demo cards as freshly updated", () => {
  const fnSource = stripTypeScriptTypes(extractFunction(sources.opportunityBoard, "formatUpdatedAt"));
  const formatUpdatedAt = new Function(`${fnSource}; return formatUpdatedAt;`)();

  assert.equal(formatUpdatedAt(), "Illustrative preview \u00b7 no live update timestamp");
  assert.equal(formatUpdatedAt("not-a-date"), "Illustrative preview \u00b7 no live update timestamp");
  assert.match(formatUpdatedAt("2026-10-19T14:05:00.000Z"), /^Updated /);
});

test("public demo surfaces describe scores as illustrative confluence, not calibrated probabilities", () => {
  assert.match(
    sources.opportunityPage,
    /illustrative confidence score \(not a calibrated outcome probability\)/
  );
  assert.match(
    sources.opportunityPage,
    /Illustrative confluence and confidence scores are not calibrated probabilities/
  );
  assert.match(
    sources.opportunityBoard,
    /Preview scores are illustrative 0\u2013100 assessments, not calibrated probabilities or forecasts/
  );
  assert.match(
    sources.opportunityBoard,
    /Signal score\s+reflects confluence and corroboration, not calibrated outcome probabilities/s
  );
  assert.match(sources.signalEngine, /Illustrative confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}\/100<\/strong>/);
  assert.match(sources.signalEngine, /Demo confluence score, not a calibrated outcome probability/);
  assert.match(
    sources.marketingCopy,
    /Evidence Stack[\s\S]*Scores are not calibrated outcome probabilities/
  );
  assert.match(
    sources.modules,
    /Motive Signal is our proprietary 0\u2013100 multi-factor confluence score, not a model confidence value or calibrated outcome probability/
  );
});

test("legacy probability-ranking and percent-confidence marketing claims stay out of demo copy", () => {
  const publicDemoCopy = [
    sources.opportunityPage,
    sources.opportunityBoard,
    sources.signalEngine,
    sources.marketingCopy,
    sources.modules,
  ].join("\n");

  assert.doesNotMatch(publicDemoCopy, /probability-ranking/i);
  assert.doesNotMatch(publicDemoCopy, /percentage confidence/i);
  assert.doesNotMatch(publicDemoCopy, /confidence\s*<strong>\{[^}]+\}%<\/strong>/i);
  assert.doesNotMatch(publicDemoCopy, /confidence\s+\{[^}]+\}%/i);
});
