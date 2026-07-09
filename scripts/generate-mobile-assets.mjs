/**
 * Generates minimal placeholder PNGs for Expo prebuild when brand assets
 * are not yet committed. Replace with final 1024×1024 artwork before store submit.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetsDir = join(root, "mobile", "assets");

// 1×1 dark pixel PNG
const MINI_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

mkdirSync(assetsDir, { recursive: true });

for (const name of ["icon.png", "adaptive-icon.png", "splash-icon.png"]) {
  writeFileSync(join(assetsDir, name), MINI_PNG);
}

console.log("[mobile-assets] Wrote placeholder PNGs to mobile/assets/");
