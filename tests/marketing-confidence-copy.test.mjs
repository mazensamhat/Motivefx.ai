import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Opportunity Radar copy labels confidence as illustrative score rather than calibrated probability', async () => {
  const page = await read('apps/site/src/app/opportunity-radar/page.tsx');
  const board = await read('apps/site/src/components/marketing/opportunity-radar-board.tsx');

  assert.match(
    page,
    /illustrative confidence score \(not a calibrated outcome probability\)/
  );
  assert.match(
    page,
    /Illustrative confluence and confidence scores are not calibrated probabilities/
  );
  assert.match(
    board,
    /Preview scores are illustrative 0.100 assessments, not calibrated probabilities or forecasts\./
  );
  assert.match(
    board,
    /reflects confluence and corroboration, not calibrated outcome probabilities/
  );
  assert.match(board, /Highest Illustrative Confidence/);
  assert.match(board, /Illustrative confidence <strong>\{card\.confidence\}\/100<\/strong>/);

  const combined = `${page}\n${board}`;
  assert.doesNotMatch(combined, /Highest Confidence/);
  assert.doesNotMatch(combined, /Confidence <strong>\{card\.confidence\}%<\/strong>/);
  assert.doesNotMatch(combined, /ranked by probability/i);
});

test('Signal Engine and Evidence Stack copy avoid presenting confidence as forecast probability', async () => {
  const signalEngine = await read('apps/site/src/components/marketing/signal-engine-section.tsx');
  const marketingCopy = await read('apps/site/src/lib/marketing-copy.ts');

  assert.match(
    signalEngine,
    /Illustrative confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}\/100<\/strong>/
  );
  assert.match(signalEngine, /Demo confluence score, not a calibrated outcome probability\./);
  assert.match(
    marketingCopy,
    /Scores are not calibrated outcome probabilities\./
  );

  const combined = `${signalEngine}\n${marketingCopy}`;
  assert.doesNotMatch(combined, /confidence percentage/i);
  assert.doesNotMatch(combined, /calibrated confidence/i);
  assert.doesNotMatch(combined, /confidence as probability/i);
});
