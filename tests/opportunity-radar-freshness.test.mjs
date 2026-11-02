import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';

const { renderToStaticMarkup } = siteRequire('react-dom/server');
const react = siteRequire('react');
const runtime = siteRequire('react/jsx-runtime');

const card = {
  id: 'qa-card',
  title: 'QA supply-chain squeeze',
  signalScore: 82,
  confidence: 76,
  horizon: '2-4 weeks',
  description: 'A deterministic card keeps the timestamp copy under test isolated.',
  drivers: ['Port dwell time', 'Freight quotes'],
  beneficiaries: ['Rail operators'],
  affectedAssets: ['Retail margins'],
  status: 'MONITORING',
  statusTone: 'stable',
  delta: 0,
  sparkline: [70, 74, 82],
  category: 'industrial',
  band: 'strong',
};

function icon(name) {
  return function Icon() {
    return runtime.jsx('span', { 'data-icon': name });
  };
}

async function renderBoard(props = {}) {
  const board = await loadSiteModule('../apps/site/src/components/marketing/opportunity-radar-board.tsx', {
    react,
    'react/jsx-runtime': runtime,
    'next/link': {
      __esModule: true,
      default: ({ href, children, ...rest }) => runtime.jsx('a', { href, ...rest, children }),
    },
    'lucide-react': {
      ArrowRight: icon('arrow-right'),
      ChevronLeft: icon('chevron-left'),
      ChevronRight: icon('chevron-right'),
      Cpu: icon('cpu'),
      Factory: icon('factory'),
      Flame: icon('flame'),
      Globe2: icon('globe'),
      HelpCircle: icon('help'),
      LayoutGrid: icon('layout'),
      Rows3: icon('rows'),
      Shield: icon('shield'),
      ShoppingBag: icon('shopping'),
      Zap: icon('zap'),
    },
    '@/lib/marketing-copy': { OPPORTUNITY_RADAR_DEMO: [] },
  });

  return renderToStaticMarkup(
    runtime.jsx(board.OpportunityRadarBoard, {
      cards: [card],
      showHowItWorks: false,
      ...props,
    })
  );
}

test('opportunity radar does not claim live freshness when no timestamp is available', async () => {
  const html = await renderBoard();

  assert.match(html, /Illustrative preview .* no live update timestamp/);
  assert.doesNotMatch(html, /Updated just now|Invalid Date/);
});

test('opportunity radar treats invalid timestamps as illustrative preview data', async () => {
  const html = await renderBoard({ updatedAt: 'not-a-real-date' });

  assert.match(html, /Illustrative preview .* no live update timestamp/);
  assert.doesNotMatch(html, /Updated just now|Invalid Date/);
});

test('opportunity radar still labels valid timestamps as updated observations', async () => {
  const html = await renderBoard({ updatedAt: '2026-10-31T14:45:00Z' });

  assert.match(html, /Updated /);
  assert.doesNotMatch(html, /no live update timestamp/);
});
