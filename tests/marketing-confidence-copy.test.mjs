import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const opportunityPage = await readFile(
  new URL("../apps/site/src/app/opportunity-radar/page.tsx", import.meta.url),
  "utf8"
);
const opportunityBoard = await readFile(
  new URL("../apps/site/src/components/marketing/opportunity-radar-board.tsx", import.meta.url),
  "utf8"
);
const signalEngine = await readFile(
  new URL("../apps/site/src/components/marketing/signal-engine-section.tsx", import.meta.url),
  "utf8"
);
const marketingCopy = await readFile(
  new URL("../apps/site/src/lib/marketing-copy.ts", import.meta.url),
  "utf8"
);

test("Opportunity Radar qualifies confidence scores as illustrative instead of calibrated probabilities", () => {
  assert.match(
    opportunityPage,
    /Time horizon and illustrative confidence score \(not a calibrated outcome probability\)/
  );
  assert.match(
    opportunityPage,
    /Illustrative confluence and confidence scores are not calibrated probabilities/
  );

  assert.match(opportunityBoard, /Preview scores are illustrative 0.*100 assessments/);
  assert.match(opportunityBoard, /not calibrated probabilities or forecasts/);
  assert.match(opportunityBoard, /Signal score\s+reflects confluence and corroboration/);
  assert.match(opportunityBoard, /Highest Illustrative Confidence/);
  assert.match(opportunityBoard, /\{stats\.highest\}\/100/);
  assert.match(opportunityBoard, /Illustrative confidence/);
  assert.match(opportunityBoard, /\{card\.confidence\}\/100/);

  assert.doesNotMatch(opportunityBoard, /blends probability and corroboration/);
  assert.doesNotMatch(opportunityBoard, /Highest Confidence/);
  assert.doesNotMatch(opportunityBoard, /\{stats\.highest\}%/);
  assert.doesNotMatch(opportunityBoard, /\{card\.confidence\}%/);
});

test("Signal Engine demo confidence is labeled as a demo score, not an outcome probability", () => {
  assert.match(signalEngine, /Illustrative confidence/);
  assert.match(signalEngine, /\{SIGNAL_FEED_DEMO\.confidence\}\/100/);
  assert.match(signalEngine, /Demo confluence score, not a calibrated outcome probability/);

  assert.doesNotMatch(signalEngine, /Confidence Ranking/);
  assert.doesNotMatch(signalEngine, /\{SIGNAL_FEED_DEMO\.confidence\}%/);
});

test("shared marketing copy keeps evidence scores distinct from calibrated probabilities", () => {
  assert.match(marketingCopy, /Confluence scores, evidence quality/);
  assert.match(marketingCopy, /Scores are not calibrated outcome probabilities/);

  assert.doesNotMatch(marketingCopy, /Confluence scores rank probable outcomes/i);
  assert.doesNotMatch(marketingCopy, /percentage confidence/i);
});
