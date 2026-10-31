import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const source = async (path) => readFile(new URL(path, import.meta.url), 'utf8');

test('Opportunity Radar page qualifies confidence as illustrative rather than probability', async () => {
  const page = await source('../apps/site/src/app/opportunity-radar/page.tsx');

  assert.match(page, /illustrative confidence score \(not a calibrated outcome probability\)/);
  assert.match(page, /Illustrative confluence and confidence scores are not calibrated probabilities/);
  assert.doesNotMatch(page, /<li>Time horizon and confidence<\/li>/);
  assert.doesNotMatch(page, /confidence scores are calibrated probabilities/i);
});

test('Opportunity Radar board keeps demo score copy on a 0-100 illustrative scale', async () => {
  const board = await source('../apps/site/src/components/marketing/opportunity-radar-board.tsx');

  assert.match(board, /Preview scores are illustrative 0\p{Pd}100 assessments, not calibrated probabilities or forecasts/u);
  assert.match(board, /Highest Illustrative Confidence/);
  assert.match(board, /Illustrative confidence <strong>\{card\.confidence\}\/100<\/strong>/);
  assert.match(board, /confluence and corroboration, not calibrated outcome probabilities/);
  assert.doesNotMatch(board, /Highest Confidence/);
  assert.doesNotMatch(board, /Confidence <strong>\{card\.confidence\}%<\/strong>/);
});

test('Signal Engine demo and shared evidence copy reject calibrated-probability framing', async () => {
  const signalEngine = await source('../apps/site/src/components/marketing/signal-engine-section.tsx');
  const marketingCopy = await source('../apps/site/src/lib/marketing-copy.ts');

  assert.match(signalEngine, /Illustrative confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}\/100<\/strong>/);
  assert.match(signalEngine, /Demo confluence score, not a calibrated outcome probability/);
  assert.doesNotMatch(signalEngine, /Confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}%<\/strong>/);

  assert.match(marketingCopy, /Scores are not calibrated outcome probabilities/);
  assert.doesNotMatch(marketingCopy, /Scores are calibrated outcome probabilities/i);
});
