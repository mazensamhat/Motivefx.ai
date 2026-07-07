import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDir = join(root, "web");
const outDir = join(root, "apps/site/public/terminal");

console.log("[terminal] Building full MotiveFX terminal for /terminal/ …");

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

execSync("npm ci && npm run build", {
  cwd: webDir,
  stdio: "inherit",
  env: { ...process.env, VITE_BASE: "/terminal/" },
});

const distDir = join(webDir, "dist");
if (!existsSync(join(distDir, "index.html"))) {
  throw new Error("[terminal] Vite build did not produce dist/index.html");
}

cpSync(distDir, outDir, { recursive: true });
console.log("[terminal] Copied build to", outDir);
