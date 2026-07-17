/**
 * Google Play store graphics for MotiveFX.
 * Outputs exact PNG sizes:
 *   feature/  1024×500  (3)
 *   phone/    1080×1920 (6)
 *   tablet/   1600×2560 (6)
 *
 * Requires: playwright + sharp under scripts/node_modules (same as iPad script).
 */
import { createRequire } from "node:module";
import { mkdirSync, rmSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlDir = join(root, "mobile/store-screenshots/html");
const outRoot = join(root, "mobile/store-screenshots");

const BG = { r: 8, g: 10, b: 12 };

const screens = [
  ["play-01-markets.html", "01-markets"],
  ["play-02-crypto.html", "02-crypto"],
  ["play-03-bets.html", "03-bets"],
  ["play-04-pinkslips.html", "04-pinkslips"],
  ["play-05-predictions.html", "05-predictions"],
  ["play-06-ai-signal.html", "06-ai-signal"],
];

const features = [
  ["feature-01-markets.html", "feature-01-markets"],
  ["feature-02-multi-asset.html", "feature-02-multi-asset"],
  ["feature-03-ai-intel.html", "feature-03-ai-intel"],
];

const sizes = {
  phone: { w: 1080, h: 1920, dir: "phone", prefix: "phone" },
  tablet: { w: 1600, h: 2560, dir: "tablet", prefix: "tablet" },
  feature: { w: 1024, h: 500, dir: "feature", prefix: "feature" },
};

for (const key of Object.keys(sizes)) {
  const dir = join(outRoot, sizes[key].dir);
  mkdirSync(dir, { recursive: true });
  // Clear prior generated PNGs in these folders only (keep html/, ipad-13/)
  if (existsSync(dir)) {
    for (const name of ["phone", "tablet", "feature"]) {
      if (sizes[key].dir === name) {
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
      }
    }
  }
}

async function renderPage(browser, htmlFile, w, h) {
  const context = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const url = pathToFileURL(join(htmlDir, htmlFile)).href;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  // Allow Google Fonts a moment if network is slow
  await page.waitForTimeout(400);
  const raw = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: w, height: h },
  });
  await page.close();
  await context.close();
  return raw;
}

async function writeOpaquePng(buffer, outPath, w, h) {
  await sharp(buffer)
    .resize(w, h, { fit: "fill" })
    .flatten({ background: BG })
    .png({ compressionLevel: 9 })
    .withMetadata({ density: 72 })
    .toFile(outPath);

  const meta = await sharp(outPath).metadata();
  if (meta.width !== w || meta.height !== h) {
    throw new Error(`Size mismatch ${outPath}: got ${meta.width}x${meta.height}, expected ${w}x${h}`);
  }
  if (meta.hasAlpha) {
    throw new Error(`Unexpected alpha channel in ${outPath}`);
  }
  console.log(`[play] ${outPath.replace(root + "\\", "").replace(root + "/", "")}  ${meta.width}x${meta.height}`);
  return meta;
}

const browser = await chromium.launch();
const results = [];

try {
  // Phone + tablet screens
  for (const [html, base] of screens) {
    for (const kind of ["phone", "tablet"]) {
      const { w, h, dir, prefix } = sizes[kind];
      const raw = await renderPage(browser, html, w, h);
      const outPath = join(outRoot, dir, `${prefix}-${base}.png`);
      const meta = await writeOpaquePng(raw, outPath, w, h);
      results.push({ path: outPath, w: meta.width, h: meta.height });
    }
  }

  // Feature graphics
  for (const [html, base] of features) {
    const { w, h, dir } = sizes.feature;
    const raw = await renderPage(browser, html, w, h);
    const outPath = join(outRoot, dir, `${base}.png`);
    const meta = await writeOpaquePng(raw, outPath, w, h);
    results.push({ path: outPath, w: meta.width, h: meta.height });
  }
} finally {
  await browser.close();
}

console.log(`[play] Done — ${results.length} files`);
console.log(`[play] Folders: ${join(outRoot, "feature")} | ${join(outRoot, "phone")} | ${join(outRoot, "tablet")}`);
