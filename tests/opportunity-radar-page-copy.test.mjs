import assert from "node:assert/strict";
import { test } from "node:test";
import { loadSiteModule, siteRequire } from "./load-site-module.mjs";

const { renderToStaticMarkup } = siteRequire("react-dom/server");
const react = siteRequire("react");
const runtime = siteRequire("react/jsx-runtime");

function MockLink({ href, children }) {
  return runtime.jsx("a", { href, children });
}
MockLink.default = MockLink;

function ContentLayout({ title, kicker, description, relatedLinks = [], children }) {
  return runtime.jsxs("main", {
    children: [
      runtime.jsx("p", { children: kicker }),
      runtime.jsx("h1", { children: title }),
      runtime.jsx("p", { children: description }),
      runtime.jsx("nav", {
        children: relatedLinks.map((link) =>
          runtime.jsx("a", { href: link.href, children: link.label }, link.href)
        ),
      }),
      children,
    ],
  });
}

function ContentSection({ title, children }) {
  return runtime.jsxs("section", {
    children: [runtime.jsx("h2", { children: title }), children],
  });
}

function ContentProse({ children }) {
  return runtime.jsx("div", { children });
}

function OpportunityRadarBoard() {
  return runtime.jsx("div", {
    "data-testid": "opportunity-radar-board",
    children: "Preview scores are illustrative 0-100 assessments, not calibrated probabilities or forecasts.",
  });
}

const pageModule = await loadSiteModule("../apps/site/src/app/opportunity-radar/page.tsx", {
  react,
  "react/jsx-runtime": runtime,
  "next/link": MockLink,
  "@/components/content/content-layout": { ContentLayout, ContentProse, ContentSection },
  "@/components/marketing/opportunity-radar-board": { OpportunityRadarBoard },
  "@/lib/seo": { pageMetadata: (metadata) => metadata },
});

test("Opportunity Radar page metadata avoids calibrated probability claims", () => {
  assert.equal(pageModule.metadata.title, "Opportunity Radar™");
  assert.equal(pageModule.metadata.path, "/opportunity-radar");
  assert.match(pageModule.metadata.description, /signal score, drivers, beneficiaries, horizon, and confidence/i);
  assert.doesNotMatch(pageModule.metadata.description, /\bprobabilit(?:y|ies)\b/i);
  assert.doesNotMatch(pageModule.metadata.description, /\bforecast(?:s|ing)?\b/i);
});

test("Opportunity Radar page copy qualifies confidence as illustrative slash-100 scoring", () => {
  const html = renderToStaticMarkup(runtime.jsx(pageModule.default, {}));

  assert.match(html, /illustrative confidence score \(not a calibrated outcome probability\)/i);
  assert.match(html, /Illustrative confluence and confidence scores are not calibrated probabilities/i);
  assert.match(html, /not advice, forecasts of profit, or trade execution/i);
  assert.match(html, /methods &amp; limitations/i);
  assert.doesNotMatch(html, /confidence\s+\d+%/i);
  assert.doesNotMatch(html, /chance of profit/i);
});
