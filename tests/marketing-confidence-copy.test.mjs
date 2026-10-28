import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const readSource = (relative) => readFile(new URL(relative, import.meta.url), "utf8");

const [marketingCopy, opportunityRadarPage, opportunityRadarBoard, signalEngineSection] =
  await Promise.all([
    readSource("../apps/site/src/lib/marketing-copy.ts"),
    readSource("../apps/site/src/app/opportunity-radar/page.tsx"),
    readSource("../apps/site/src/components/marketing/opportunity-radar-board.tsx"),
    readSource("../apps/site/src/components/marketing/signal-engine-section.tsx"),
  ]);

test("marketing feature copy avoids presenting demo confidence as calibrated probability", () => {
  assert.match(
    marketingCopy,
    /title: "Opportunity Radar\u2122"[\s\S]*?ranked by signal strength, supporting evidence/i,
  );
  assert.doesNotMatch(
    marketingCopy,
    /title: "Opportunity Radar\u2122"[\s\S]*?ranked by probability/i,
  );

  assert.match(
    marketingCopy,
    /title: "Evidence Stack"[\s\S]*?not calibrated outcome probabilities/i,
  );
  assert.doesNotMatch(
    marketingCopy,
    /Probability, confidence, supporting factors, analogues/i,
  );
});

test("Opportunity Radar and Signal Engine surfaces qualify confidence scores", () => {
  assert.match(
    opportunityRadarPage,
    /Time horizon and illustrative confidence score \(not a calibrated outcome probability\)/,
  );
  assert.match(
    opportunityRadarPage,
    /Illustrative confluence and confidence scores are not calibrated probabilities\./,
  );

  assert.match(
    opportunityRadarBoard,
    /Preview scores are illustrative 0[\u2013-]100 assessments, not calibrated probabilities or forecasts\./,
  );
  assert.match(opportunityRadarBoard, /Highest Illustrative Confidence/);
  assert.match(opportunityRadarBoard, /\{stats\.highest\}\/100/);
  assert.match(opportunityRadarBoard, /Illustrative confidence/);
  assert.match(opportunityRadarBoard, /\{card\.confidence\}\/100/);
  assert.match(opportunityRadarBoard, /not calibrated outcome probabilities/);

  assert.match(signalEngineSection, /Illustrative confidence/);
  assert.match(signalEngineSection, /\{SIGNAL_FEED_DEMO\.confidence\}\/100/);
  assert.match(
    signalEngineSection,
    /Demo confluence score, not a calibrated outcome probability\./,
  );
});

test("legacy probability-style marketing claims do not return", () => {
  assert.doesNotMatch(marketingCopy, /Developing situations ranked by probability, evidence/);
  assert.doesNotMatch(
    marketingCopy,
    /Probability, confidence, supporting factors, analogues\s+[\u2014-]\s+not vibes\./,
  );
  assert.doesNotMatch(opportunityRadarPage, /<li>Time horizon and confidence<\/li>/);
  assert.doesNotMatch(opportunityRadarBoard, /Signal score\s+blends probability and corroboration/);
  assert.doesNotMatch(opportunityRadarBoard, /Highest Confidence/);
  assert.doesNotMatch(opportunityRadarBoard, /Confidence <strong>\{card\.confidence\}%<\/strong>/);
  assert.doesNotMatch(
    signalEngineSection,
    /Confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}%<\/strong>/,
  );
});
