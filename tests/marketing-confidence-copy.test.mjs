import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';

const { renderToStaticMarkup } = siteRequire('react-dom/server');
const react = siteRequire('react');
const runtime = siteRequire('react/jsx-runtime');

const copy = await loadSiteModule('../apps/site/src/lib/marketing-copy.ts');

function MockIcon(props) {
  return runtime.jsx('svg', { ...props, 'data-testid': 'mock-icon' });
}

const lucideIcons = Object.fromEntries(
  [
    'ArrowRight',
    'ChevronLeft',
    'ChevronRight',
    'Cpu',
    'Factory',
    'Flame',
    'Globe2',
    'HelpCircle',
    'LayoutGrid',
    'Rows3',
    'Shield',
    'ShoppingBag',
    'Zap',
  ].map((name) => [name, MockIcon])
);

function MockLink({ href, className, children }) {
  return runtime.jsx('a', { href, className, children });
}
MockLink.default = MockLink;

const mocks = {
  react,
  'react/jsx-runtime': runtime,
  'next/link': MockLink,
  'lucide-react': lucideIcons,
  '@/lib/marketing-copy': copy,
};

const demoCard = {
  id: 'qa-card',
  title: 'QA Signal',
  signalScore: 82,
  confidence: 73,
  horizon: '3 months',
  description: 'A deterministic marketing fixture.',
  drivers: ['Driver one', 'Driver two'],
  beneficiaries: ['Beneficiary one'],
  affectedAssets: ['Asset one'],
  status: 'STRENGTHENING',
  statusTone: 'growing',
  delta: 2,
  sparkline: [70, 73, 82],
  category: 'technology',
  band: 'strong',
};

test('marketing feature copy does not reframe Opportunity Radar scores as probabilities', () => {
  const featureDescriptions = new Map(copy.FEATURES.map((feature) => [feature.title, feature.description]));
  const opportunityRadarDescription = copy.FEATURES.find((feature) =>
    feature.title.startsWith('Opportunity Radar')
  )?.description;

  assert.equal(typeof opportunityRadarDescription, 'string');
  assert.match(opportunityRadarDescription, /signal strength/i);
  assert.doesNotMatch(opportunityRadarDescription, /\bprobability\b/i);
  assert.match(featureDescriptions.get('Evidence Stack'), /not calibrated outcome probabilities/i);
});

test('Opportunity Radar board labels preview confidence as illustrative slash-100 scores', async () => {
  const board = await loadSiteModule(
    '../apps/site/src/components/marketing/opportunity-radar-board.tsx',
    mocks
  );
  const html = renderToStaticMarkup(
    runtime.jsx(board.OpportunityRadarBoard, {
      cards: [demoCard],
      showHowItWorks: false,
      updatedAt: '2026-10-26T08:00:00Z',
    })
  );

  assert.match(html, /Preview scores are illustrative .* not calibrated probabilities or forecasts/);
  assert.match(html, /Highest Illustrative Confidence/);
  assert.match(html, /Illustrative confidence/);
  assert.match(html, /73\/100/);
  assert.doesNotMatch(html, /Highest Confidence/);
  assert.doesNotMatch(html, /73%/);
  assert.doesNotMatch(html, /blends probability and corroboration/i);
});

test('Motive Signal demo confidence is not rendered as a percentage claim', async () => {
  const section = await loadSiteModule(
    '../apps/site/src/components/marketing/signal-engine-section.tsx',
    mocks
  );
  const html = renderToStaticMarkup(runtime.jsx(section.SignalEngineSection, {}));

  assert.match(html, /Illustrative confidence/);
  assert.match(html, /86\/100/);
  assert.match(html, /not a calibrated outcome probability/);
  assert.doesNotMatch(html, /Confidence(?:<[^>]+>|\s)*86%/i);
});
