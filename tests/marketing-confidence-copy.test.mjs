import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';

const readSource = async path => readFile(new URL(path, import.meta.url), 'utf8');

test('marketing feature copy qualifies heuristic scores instead of calling them probabilities', async () => {
  const copy = await readSource('../apps/site/src/lib/marketing-copy.ts');

  assert.match(
    copy,
    /title: "Opportunity Radar\u2122",\s+description: "Developing situations ranked by signal strength, supporting evidence, and who stands to benefit\."/m
  );
  assert.match(
    copy,
    /title: "Evidence Stack",\s+description: "Confluence scores, evidence quality, supporting factors, analogues . not vibes\. Scores are not calibrated outcome probabilities\."/m
  );
  assert.doesNotMatch(copy, /Developing situations ranked by probability/i);
});

test('opportunity radar surfaces display confidence as illustrative 0-100 scores', async () => {
  const [page, board, signalEngine] = await Promise.all([
    readSource('../apps/site/src/app/opportunity-radar/page.tsx'),
    readSource('../apps/site/src/components/marketing/opportunity-radar-board.tsx'),
    readSource('../apps/site/src/components/marketing/signal-engine-section.tsx'),
  ]);

  assert.match(page, /illustrative confidence score \(not a calibrated outcome probability\)/);
  assert.match(page, /scores are not calibrated probabilities/i);

  assert.match(
    board,
    /Preview scores are illustrative 0.100 assessments, not calibrated probabilities or forecasts\./
  );
  assert.match(board, /reflects confluence and corroboration, not calibrated outcome probabilities/);
  assert.match(board, /Highest Illustrative Confidence/);
  assert.match(board, /\{stats\.highest\}\/100/);
  assert.match(board, /Illustrative confidence <strong>\{card\.confidence\}\/100<\/strong>/);
  assert.doesNotMatch(board, /Highest Confidence/);
  assert.doesNotMatch(board, /Confidence <strong>\{card\.confidence\}%<\/strong>/);

  assert.match(signalEngine, /Illustrative confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}\/100<\/strong>/);
  assert.match(signalEngine, /Demo confluence score, not a calibrated outcome probability\./);
  assert.doesNotMatch(signalEngine, /Confidence <strong>\{SIGNAL_FEED_DEMO\.confidence\}%<\/strong>/);
});
