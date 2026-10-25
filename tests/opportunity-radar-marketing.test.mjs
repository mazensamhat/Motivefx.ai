import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSiteModule, siteRequire } from './load-site-module.mjs';

const runtime = siteRequire('react/jsx-runtime');
const react = siteRequire('react');
const { renderToStaticMarkup } = siteRequire('react-dom/server');

const iconNames = [
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
];

const icons = Object.fromEntries(
  iconNames.map((name) => [
    name,
    (props = {}) => runtime.jsx('svg', { ...props, 'data-icon': name }),
  ])
);

const Link = ({ href, className, children }) =>
  runtime.jsx('a', { href: String(href), className, children });
Link.default = Link;

const marketingCopy = await loadSiteModule('../apps/site/src/lib/marketing-copy.ts');
const boardModule = await loadSiteModule('../apps/site/src/components/marketing/opportunity-radar-board.tsx', {
  react,
  'react/jsx-runtime': runtime,
  'next/link': Link,
  'lucide-react': icons,
  '@/lib/marketing-copy': marketingCopy,
});
const signalModule = await loadSiteModule('../apps/site/src/components/marketing/signal-engine-section.tsx', {
  'react/jsx-runtime': runtime,
  '@/lib/marketing-copy': marketingCopy,
});

function compact(html) {
  return html.replace(/\s+/g, ' ');
}

test('Opportunity Radar demo copy describes heuristic scores rather than calibrated probabilities', () => {
  const featureCopy = marketingCopy.FEATURES.map((feature) => feature.description).join(' ');

  assert.doesNotMatch(featureCopy, /ranked by probability/i);
  assert.doesNotMatch(featureCopy, /Probability,\s*confidence/i);
  assert.match(featureCopy, /ranked by signal strength/i);
  assert.match(featureCopy, /Scores are not calibrated outcome probabilities/i);
});

test('Opportunity Radar board renders confidence as illustrative 0-100 scoring with disclaimers', () => {
  const html = compact(
    renderToStaticMarkup(
      runtime.jsx(boardModule.OpportunityRadarBoard, { showHowItWorks: false })
    )
  );

  assert.match(
    html,
    /Preview scores are illustrative 0.{1,8}100 assessments, not calibrated probabilities or forecasts/
  );
  assert.match(html, /Highest Illustrative Confidence/);
  assert.match(html, /Illustrative confidence <strong>91\/100<\/strong>/);
  assert.doesNotMatch(html, /Highest Confidence/);
  assert.doesNotMatch(html, /Confidence <strong>\d+%<\/strong>/);
});

test('Signal Engine demo avoids presenting confidence as a forecast probability', () => {
  const html = compact(renderToStaticMarkup(runtime.jsx(signalModule.SignalEngineSection, {})));

  assert.match(html, /Illustrative confidence <strong>86\/100<\/strong>/);
  assert.match(html, /Demo confluence score, not a calibrated outcome probability/);
  assert.doesNotMatch(html, /Confidence <strong>86%<\/strong>/);
});

test('Opportunity Radar page includes the limitations copy around illustrative confidence', async () => {
  const contentLayout = {
    ContentLayout: ({ title, kicker, description, children }) =>
      runtime.jsxs('main', {
        children: [
          runtime.jsx('p', { children: kicker }),
          runtime.jsx('h1', { children: title }),
          runtime.jsx('p', { children: description }),
          children,
        ],
      }),
    ContentSection: ({ title, children }) =>
      runtime.jsxs('section', { children: [runtime.jsx('h2', { children: title }), children] }),
    ContentProse: ({ children }) => runtime.jsx('div', { children }),
  };
  const pageModule = await loadSiteModule('../apps/site/src/app/opportunity-radar/page.tsx', {
    'react/jsx-runtime': runtime,
    'next/link': Link,
    '@/components/content/content-layout': contentLayout,
    '@/components/marketing/opportunity-radar-board': boardModule,
    '@/lib/seo': { pageMetadata: (metadata) => metadata },
  });

  const html = compact(renderToStaticMarkup(runtime.jsx(pageModule.default, {})));

  assert.match(html, /Time horizon and illustrative confidence score \(not a calibrated outcome probability\)/);
  assert.match(html, /Illustrative confluence and confidence scores are not calibrated probabilities/);
  assert.match(html, /not advice, forecasts of profit, or trade execution/);
  assert.doesNotMatch(html, /Time horizon and confidence<\/li>/);
});
