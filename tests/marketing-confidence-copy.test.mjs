import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { loadSiteModule } from './load-site-module.mjs';

const normalize = value => value.replace(/\s+/g, ' ');

test('Opportunity Radar timestamp copy never implies freshness without a usable timestamp', async () => {
  const { __formatUpdatedAt } = await loadSiteModule(
    '../apps/site/src/components/marketing/opportunity-radar-board.tsx',
    {
      '@/lib/marketing-copy': { OPPORTUNITY_RADAR_DEMO: [] },
      'next/link': () => null,
      'react': {
        useEffect() {},
        useMemo: fn => fn(),
        useRef: () => ({ current: null }),
        useState: value => [value, () => {}],
      },
      'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: Symbol.for('react.fragment') },
      'lucide-react': new Proxy({}, { get: () => () => null }),
    },
    '\nmodule.exports.__formatUpdatedAt = formatUpdatedAt;'
  );

  assert.match(__formatUpdatedAt(), /no live update timestamp/);
  assert.match(__formatUpdatedAt('not-a-date'), /no live update timestamp/);
  assert.doesNotMatch(__formatUpdatedAt(), /^Updated /);
  assert.match(__formatUpdatedAt('2026-11-01T14:05:00.000Z'), /^Updated /);
});

test('marketing copy describes Motive Signal scores as confluence, not calibrated probabilities', async () => {
  const marketing = await loadSiteModule('../apps/site/src/lib/marketing-copy.ts');
  const { MODULES } = await loadSiteModule('../apps/site/src/content/modules/index.ts');

  const opportunityRadar = marketing.FEATURES.find(feature => feature.title.startsWith('Opportunity Radar'));
  assert.equal(
    opportunityRadar.description,
    'Developing situations ranked by signal strength, supporting evidence, and who stands to benefit.'
  );

  const evidenceStack = marketing.FEATURES.find(feature => feature.title === 'Evidence Stack');
  assert.match(evidenceStack.description, /Confluence scores, evidence quality/);
  assert.match(evidenceStack.description, /not calibrated outcome probabilities/);

  const stocksCopy = normalize(MODULES.stocks.sections.flatMap(section => section.paragraphs).join(' '));
  assert.match(stocksCopy, /Motive Signal confluence scores/);
  assert.match(stocksCopy, /not a model confidence value or calibrated outcome probability/);
  assert.doesNotMatch(stocksCopy, /Motive Signal confidence scores/);
  assert.doesNotMatch(stocksCopy, /proprietary 0.?100 confidence score/i);
});

test('public demo surfaces label confidence as illustrative /100 scores', async () => {
  const [page, board, signal] = await Promise.all([
    readFile(new URL('../apps/site/src/app/opportunity-radar/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../apps/site/src/components/marketing/opportunity-radar-board.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../apps/site/src/components/marketing/signal-engine-section.tsx', import.meta.url), 'utf8'),
  ]);

  const combined = normalize([page, board, signal].join(' '));
  assert.match(combined, /illustrative confidence score \(not a calibrated outcome probability\)/i);
  assert.match(combined, /Illustrative confluence and confidence scores are not calibrated probabilities/);
  assert.match(combined, /Preview scores are illustrative 0.100 assessments, not calibrated probabilities or forecasts/);
  assert.match(combined, /Illustrative confidence <strong>\{card\.confidence\}\/100<\/strong>/);
  assert.match(combined, /Illustrative confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}\/100<\/strong>/);
  assert.match(combined, /Demo confluence score, not a calibrated outcome probability/);
  assert.doesNotMatch(combined, /ranked by probability/i);
  assert.doesNotMatch(combined, /blends probability and corroboration/i);
  assert.doesNotMatch(combined, /Highest Confidence/);
  assert.doesNotMatch(combined, /Confidence <strong>\{(?:card|SIGNAL_FEED_DEMO)\.confidence\}%<\/strong>/);
});
