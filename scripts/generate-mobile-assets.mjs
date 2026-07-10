/**
 * Builds store-ready Expo icons from the official MotiveFX brand mark.
 * Source: apps/site/public/brand/motivefx-icon.png
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "mobile", "assets");
const sourceCandidates = [
  join(root, "apps/site/public/brand/motivefx-icon.png"),
  join(root, "apps/site/public/brand/motivefx-logo.png"),
  join(root, "web/public/brand/motivefx-icon.png"),
  join(root, "web/public/brand/motivefx-logo.png"),
];

const BG = { r: 8, g: 10, b: 12, alpha: 1 }; // #080a0c

const source = sourceCandidates.find((p) => existsSync(p));
if (!source) {
  throw new Error("[mobile-assets] Official MotiveFX logo not found under public/brand/");
}

mkdirSync(assetsDir, { recursive: true });

async function writeIcon(filename, size, paddingRatio) {
  const pad = Math.round(size * paddingRatio);
  const inner = size - pad * 2;
  const resized = await sharp(source)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: BG,
    },
  })
    .composite([{ input: resized, gravity: "centre" }])
    .png()
    .toFile(join(assetsDir, filename));
}

await writeIcon("icon.png", 1024, 0.12);
// Android adaptive icons crop edges — keep mark in safe center
await writeIcon("adaptive-icon.png", 1024, 0.22);
await writeIcon("splash-icon.png", 1024, 0.18);

copyFileSync(source, join(assetsDir, "motivefx-brand-source.png"));

console.log("[mobile-assets] Wrote official MotiveFX icons to mobile/assets/");
console.log("[mobile-assets] Source:", source);
console.log("[mobile-assets] Files: icon.png, adaptive-icon.png, splash-icon.png (1024×1024)");
