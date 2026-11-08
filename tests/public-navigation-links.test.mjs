import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("registration consent links to the actual Terms of Service", async () => {
  const source = await read("apps/site/src/components/auth/auth-form.tsx");
  assert.match(source, /<Link href="\/terms"[^>]*>\s*Terms of Service\s*<\/Link>/);
  assert.doesNotMatch(source, /href="\/faq\/is-motivefx-ai-financial-advice"/);
});

test("shared navigation resolves home sections from subpages", async () => {
  const nav = await read("apps/site/src/components/marketing/site-nav.tsx");
  const footer = await read("apps/site/src/components/marketing/site-footer.tsx");
  const graph = nav.match(/href: "([^"]+)", label: "Relationship Graph"/)?.[1];
  const features = footer.match(/<Link href="([^"]+)">Features<\/Link>/)?.[1];
  assert.equal(graph, "/#relationship-graph");
  assert.equal(features, "/#features");
  for (const page of ["/", "/terms", "/faq/is-motivefx-ai-financial-advice", "/pricing"]) {
    assert.equal(new URL(graph, "https://www.motivefxai.com" + page).pathname, "/");
    assert.equal(new URL(features, "https://www.motivefxai.com" + page).pathname, "/");
  }
});
