import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const readSource = async path => readFile(new URL(path, import.meta.url), 'utf8');
const compact = value => value.replace(/\s+/g, ' ');

test('Opportunity Radar copy presents confidence as illustrative scoring, not probabilities', async () => {
  const page = compact(await readSource('../apps/site/src/app/opportunity-radar/page.tsx'));
  const board = compact(await readSource('../apps/site/src/components/marketing/opportunity-radar-board.tsx'));

  assert.match(
    page,
    /illustrative confidence score \(not a calibrated outcome probability\)/i
  );
  assert.match(page, /Illustrative confluence and confidence scores are not calibrated probabilities/i);

  assert.match(board, /Preview scores are illustrative 0.100 assessments, not calibrated probabilities or forecasts/i);
  assert.match(board, /Signal score reflects confluence and corroboration, not calibrated outcome probabilities/i);
  assert.match(board, /Highest Illustrative Confidence/i);
  assert.match(board, /Illustrative confidence <strong>\{card\.confidence\}\/100<\/strong>/i);

  assert.doesNotMatch(board, /Highest Confidence/i);
  assert.doesNotMatch(board, /Confidence <strong>\{card\.confidence\}%<\/strong>/i);
  assert.doesNotMatch(board, /Signal score\s+blends probability/i);
});

test('Signal Engine demo labels confidence as a demo confluence score', async () => {
  const source = compact(await readSource('../apps/site/src/components/marketing/signal-engine-section.tsx'));

  assert.match(source, /Illustrative confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}\/100<\/strong>/i);
  assert.match(source, /Demo confluence score, not a calibrated outcome probability/i);
  assert.doesNotMatch(source, /Confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}%<\/strong>/i);
});

test('shared marketing feature cards avoid probability-ranking claims for heuristic scores', async () => {
  const source = compact(await readSource('../apps/site/src/lib/marketing-copy.ts'));

  assert.match(source, /title: "Opportunity Radar.*?Developing situations ranked by signal strength, supporting evidence, and who stands to benefit\./);
  assert.match(source, /title: "Evidence Stack".*?Scores are not calibrated outcome probabilities\./);
  assert.doesNotMatch(source, /Developing situations ranked by probability/i);
});
