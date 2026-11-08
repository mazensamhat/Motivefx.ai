import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { loadSiteModule } from "./load-site-module.mjs";

const component = () => null;
const iconMocks = new Proxy({}, { get: () => component });
const jsxRuntime = { Fragment: "Fragment", jsx: component, jsxs: component };
const reactMocks = {
  useEffect: () => {},
  useMemo: (fn) => fn(),
  useRef: () => ({ current: null }),
  useState: (initial) => [initial, () => {}],
};

async function readSiteFile(relative) {
  return readFile(new URL(`../${relative}`, import.meta.url), "utf8");
}

test("opportunity radar does not imply live freshness without a valid timestamp", async () => {
  const radar = await loadSiteModule(
    "../apps/site/src/components/marketing/opportunity-radar-board.tsx",
    {
      react: reactMocks,
      "react/jsx-runtime": jsxRuntime,
      "next/link": component,
      "lucide-react": iconMocks,
      "@/lib/marketing-copy": { OPPORTUNITY_RADAR_DEMO: [] },
    },
    "\nmodule.exports.__formatUpdatedAt = formatUpdatedAt;\n"
  );

  for (const missingOrInvalid of [undefined, "", "not-a-date"]) {
    const label = radar.__formatUpdatedAt(missingOrInvalid);
    assert.match(label, /Illustrative preview/);
    assert.match(label, /no live update timestamp/);
    assert.doesNotMatch(label, /^Updated /);
  }

  assert.match(radar.__formatUpdatedAt("2026-10-19T12:34:00.000Z"), /^Updated /);
});

test("public marketing copy frames scores as illustrative confluence, not calibrated probability", async () => {
  const [
    radarBoard,
    radarPage,
    signalEngine,
    marketingCopy,
    moduleCopy,
  ] = await Promise.all([
    readSiteFile("apps/site/src/components/marketing/opportunity-radar-board.tsx"),
    readSiteFile("apps/site/src/app/opportunity-radar/page.tsx"),
    readSiteFile("apps/site/src/components/marketing/signal-engine-section.tsx"),
    readSiteFile("apps/site/src/lib/marketing-copy.ts"),
    readSiteFile("apps/site/src/content/modules/index.ts"),
  ]);

  assert.match(radarBoard, /Preview scores are illustrative 0.100 assessments, not calibrated probabilities or forecasts/);
  assert.match(radarPage, /Illustrative confluence and confidence scores are not calibrated probabilities/);
  assert.match(marketingCopy, /Scores are not calibrated outcome probabilities/);
  assert.match(moduleCopy, /not a model confidence value or calibrated outcome probability/);
  assert.doesNotMatch(radarBoard, />\s*Probability\s*</);
  assert.match(radarBoard, /Signal score/);

  for (const [name, source] of Object.entries({
    radarBoard,
    radarPage,
    signalEngine,
    marketingCopy,
    moduleCopy,
  })) {
    assert.doesNotMatch(source, /probability-ranking|probability ranking|ranked by probability/i, name);
    assert.doesNotMatch(source, /percent-confidence|percent confidence|confidence percentage|%\s*confidence/i, name);
    assert.doesNotMatch(source, /Updated (just now|moments ago)/i, name);
  }
});

test("legacy demo probability field is presented as a signal score", async () => {
  const radar = await loadSiteModule(
    "../apps/site/src/components/marketing/opportunity-radar-board.tsx",
    {
      react: reactMocks,
      "react/jsx-runtime": jsxRuntime,
      "next/link": component,
      "lucide-react": iconMocks,
      "@/lib/marketing-copy": { OPPORTUNITY_RADAR_DEMO: [] },
    }
  );

  const [card] = radar.demoToRadarCards([
    {
      theme: "AI Infrastructure Boom",
      probability: 94,
      confidence: 91,
      horizon: "3-9 months",
      evidence: ["Hyperscaler CapEx"],
      beneficiaries: ["Semiconductors"],
      affectedAssets: ["NVDA"],
      status: "GROWING FAST",
      statusTone: "growing",
      delta: 6,
      sparkline: [72, 94],
      category: "technology",
      band: "strong",
      description: "CapEx and semis are reinforcing.",
    },
  ]);

  assert.equal(card.signalScore, 94);
  assert.equal(card.confidence, 91);
  assert.equal(card.band, "strong");
});
