import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const sharp = require("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlDir = join(root, "mobile/store-screenshots/html");
const outDir = join(root, "mobile/store-screenshots/ipad-13");

// Wipe and recreate so Apple gets clean files only
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const pages = [
  ["01-home.html", "01-home"],
  ["02-trades.html", "02-trades"],
  ["03-crypto.html", "03-crypto"],
  ["04-polymarket.html", "04-polymarket"],
];

// Apple accepted sizes for 12.9"/13" iPad
const SIZES = [
  { w: 2064, h: 2752, label: "2064x2752" },
  { w: 2048, h: 2732, label: "2048x2732" },
];

const browser = await chromium.launch();

for (const [html, base] of pages) {
  // Render at the larger Apple size first
  const context = await browser.newContext({
    viewport: { width: 2064, height: 2752 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(pathToFileURL(join(htmlDir, html)).href, { waitUntil: "networkidle" });
  const raw = await page.screenshot({
    type: "png",
    clip: { x: 0, y: 0, width: 2064, height: 2752 },
  });
  await page.close();
  await context.close();

  for (const { w, h, label } of SIZES) {
    // Flatten to opaque sRGB JPEG — App Store is picky about alpha/PNG quirks
    const jpegPath = join(outDir, `${base}-${label}.jpg`);
    await sharp(raw)
      .resize(w, h, { fit: "fill" })
      .flatten({ background: { r: 8, g: 10, b: 12 } })
      .jpeg({ quality: 92, mozjpeg: true })
      .withMetadata({ density: 72 })
      .toFile(jpegPath);

    // Also opaque PNG (no alpha) as backup
    const pngPath = join(outDir, `${base}-${label}.png`);
    await sharp(raw)
      .resize(w, h, { fit: "fill" })
      .flatten({ background: { r: 8, g: 10, b: 12 } })
      .png({ compressionLevel: 9 })
      .withMetadata({ density: 72 })
      .toFile(pngPath);

    const meta = await sharp(jpegPath).metadata();
    console.log(`[ipad] ${base}-${label}.jpg  ${meta.width}x${meta.height}  alpha=${meta.hasAlpha}  ${meta.format}`);
  }
}

await browser.close();
console.log("[ipad] Done. Upload the *.jpg files first (2064x2752).");
console.log("[ipad] Folder:", outDir);
