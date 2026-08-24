/**
 * App Store Review demo recorder — MotiveFX terminal (same WebView as iOS shell).
 * Production www /terminal currently white-screens after age gate (ModulesProvider renders
 * WinHookModal outside GenerationalProvider). This capture uses local Vite (provider order
 * fixed) with VITE_API_PROXY=https://www.motivefxai.com so data/auth hit live APIs.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { spawnSync } = require("child_process");

const OUT_MP4 = "C:/Users/Mazen/Desktop/MotiveFX_App_Review_Demo.mp4";
const OUT_README = "C:/Users/Mazen/Desktop/MotiveFX_App_Review_Demo_README.txt";
const ASSETS_DIR = "C:/Users/Mazen/Desktop/assets";
const WORK = path.join(__dirname, ".recording-work");
const DEMO_EMAIL = "impactmedia313@gmail.com";
const DEMO_PASSWORD = "test1234";
const BIRTH_YEAR = "1990";
const VIEWPORT = { width: 1180, height: 820 };
const TERMINAL_URL = process.env.MOTIVEFX_TERMINAL_URL || "http://127.0.0.1:5280/";
const MARKETING_URL = "https://www.motivefxai.com/";

const chromeCandidates = [
  "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  "C:/Users/Mazen/AppData/Local/Temp/cursor-sandbox-cache/8df1da9df054aa6ef6011b8c73cc9dfa/playwright/chromium-1234/chrome-win64/chrome.exe",
];

function findChrome() {
  return chromeCandidates.find((p) => fs.existsSync(p));
}

function findFfmpeg() {
  const fromPath = spawnSync("where.exe", ["ffmpeg"], { encoding: "utf8" });
  if (fromPath.status === 0) {
    const line = fromPath.stdout
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean)[0];
    if (line && fs.existsSync(line)) return line;
  }
  const winget =
    "C:/Users/Mazen/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0-full_build/bin/ffmpeg.exe";
  return fs.existsSync(winget) ? winget : null;
}

function ensureDir(d) {
  fs.mkdirSync(d, { recursive: true });
}

async function pause(page, ms = 2500) {
  await page.waitForTimeout(ms);
}

async function safeClick(page, locator, label, timeout = 10000) {
  try {
    const el = typeof locator === "string" ? page.locator(locator) : locator;
    await el.first().waitFor({ state: "visible", timeout });
    await el.first().click({ timeout: 8000 });
    console.log("clicked:", label);
    return true;
  } catch (e) {
    console.warn("click failed:", label, (e.message || "").split("\n")[0]);
    return false;
  }
}

async function scrollMain(page, steps = 3) {
  for (let i = 0; i < steps; i++) {
    await page.mouse.wheel(0, 480);
    await pause(page, 1000);
  }
  await page.mouse.wheel(0, -1100);
  await pause(page, 900);
}

async function dismissOverlays(page) {
  // Intel tour: Next… then Enter Daily Brief, or Close tour
  for (let i = 0; i < 6; i++) {
    const next = page.getByRole("button", { name: /^Next$/i });
    if (await next.isVisible().catch(() => false)) {
      await next.click().catch(() => {});
      await pause(page, 800);
      continue;
    }
    const enter = page.getByRole("button", { name: /Enter Daily Brief/i });
    if (await enter.isVisible().catch(() => false)) {
      await enter.click().catch(() => {});
      await pause(page, 1000);
      break;
    }
    break;
  }
  const closeTour = page.getByRole("button", { name: /Close tour/i });
  if (await closeTour.isVisible().catch(() => false)) {
    await closeTour.click().catch(() => {});
    await pause(page, 800);
  }

  // Generational setup — pick Millennial (18+) and apply, else dismiss
  const mill = page.locator(".gen-setup-cohort", { hasText: /Millennial/i });
  if (await mill.count()) {
    await mill.first().click().catch(() => {});
    await pause(page, 700);
    const apply = page.locator(".gen-setup-confirm");
    if (await apply.isVisible().catch(() => false)) {
      await apply.click().catch(() => {});
      await pause(page, 1200);
    }
  }
  const dismiss = page.getByRole("button", { name: /^Dismiss$/i });
  if (await dismiss.isVisible().catch(() => false)) {
    await dismiss.click().catch(() => {});
    await pause(page, 800);
  }
  // click-away overlay if still open
  if (await page.locator(".gen-setup-overlay").isVisible().catch(() => false)) {
    await page.locator(".gen-setup-overlay").click({ position: { x: 8, y: 8 } }).catch(() => {});
    await pause(page, 800);
  }
  if (await page.locator(".intel-tour-overlay").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /Close tour/i }).click().catch(() => {});
    await pause(page, 800);
  }

  // Win-hook / upsell modal — dismiss WITHOUT starting a purchase (App Review: no IAP)
  const skipUpsell = page.locator("button.win-hook-skip-v2, .win-hook-skip-v2");
  if (await skipUpsell.first().isVisible().catch(() => false)) {
    await skipUpsell.first().click().catch(() => {});
    await pause(page, 1200);
  }
  if (await page.locator(".win-hook-overlay").isVisible().catch(() => false)) {
    await page.getByRole("button", { name: /^Dismiss$/i }).click().catch(() => {});
    await page.getByText(/Continue with single-module desk/i).click().catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await pause(page, 1000);
  }
}

async function passAgeGate(page) {
  const overlay = page.locator(".age-gate-overlay");
  const visible = await overlay.isVisible().catch(() => false);
  if (!visible) {
    console.log("age gate not shown");
    return false;
  }
  await pause(page, 2200);
  await page.locator('select[aria-label="Birth year"]').selectOption(BIRTH_YEAR);
  await pause(page, 1600);
  await page.getByRole("button", { name: "Continue" }).click();
  await overlay.waitFor({ state: "hidden", timeout: 20000 }).catch(() => {});
  await pause(page, 2800);
  console.log("age gate passed");
  return true;
}

async function clickNav(page, label) {
  const clicked = await page.evaluate((lab) => {
    const nodes = [...document.querySelectorAll(".sidebar-item, .mobile-bottom-nav-item")];
    const el = nodes.find((n) => (n.textContent || "").replace(/\s+/g, " ").trim().startsWith(lab));
    if (el) {
      el.click();
      return true;
    }
    return false;
  }, label);
  if (clicked) {
    console.log("nav:", label);
    await pause(page, 3000);
    return true;
  }
  console.warn("nav miss:", label);
  return false;
}

async function tryLogin(page, notes) {
  let opened =
    (await safeClick(
      page,
      page.locator(".account-menu button", { hasText: "Sign in" }),
      "Sign in (account-menu)"
    )) ||
    (await safeClick(
      page,
      page.locator(".mobile-header-tool", { hasText: "Sign in" }),
      "Sign in (mobile header)"
    )) ||
    (await safeClick(page, page.getByRole("button", { name: /^Sign in$/i }), "Sign in (any)"));

  if (!opened) {
    notes.login = "failed_open_modal";
    return false;
  }
  await pause(page, 2200);

  const email = page.locator('.auth-modal input[type="email"]');
  const password = page.locator('.auth-modal input[type="password"]');
  if (!(await email.count()) || !(await password.count())) {
    notes.login = "modal_missing_fields";
    return false;
  }

  await email.fill(DEMO_EMAIL);
  await pause(page, 900);
  await password.fill(DEMO_PASSWORD);
  await pause(page, 1400);
  await page.locator('.auth-modal button[type="submit"]').click();
  await pause(page, 5500);

  const errText = ((await page.locator(".auth-error").textContent().catch(() => "")) || "").trim();
  const stillAuth = await page.locator(".auth-overlay").isVisible().catch(() => false);
  const authed =
    (await page.locator(".account-menu-authed").count()) > 0 ||
    (await page.locator(".mobile-header-tool", { hasText: "Account" }).count()) > 0;

  if (authed && !stillAuth) {
    notes.login = "success";
    console.log("login success");
    return true;
  }
  if (errText) notes.login = "failed: " + errText;
  else if (stillAuth) notes.login = "failed_still_on_modal_maybe_2fa_or_bad_creds";
  else notes.login = "uncertain";

  console.warn("login result:", notes.login);
  await page.locator(".auth-close").click().catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  await pause(page, 1000);
  return notes.login === "success";
}

async function showDeleteAccountPath(page, notes, snap) {
  // Prefer header Account; fall back to evaluate open if needed
  let opened =
    (await safeClick(
      page,
      page.locator(".account-menu-authed button", { hasText: "Account" }),
      "Account authed"
    )) ||
    (await safeClick(page, page.locator(".account-menu button", { hasText: "Account" }), "Account")) ||
    (await safeClick(
      page,
      page.locator(".mobile-header-tool", { hasText: "Account" }),
      "Account mobile"
    ));

  if (!opened) {
    opened = await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /^Account$/i.test((b.textContent || "").trim())
      );
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    if (opened) console.log("clicked: Account (eval)");
  }

  if (!opened) {
    notes.deletePath = "account_button_not_found";
    return;
  }
  await pause(page, 2800);

  const deleteHeading = page.locator(".account-settings-modal h3, h3", { hasText: "Delete account" });
  if (await deleteHeading.count()) {
    await deleteHeading.first().scrollIntoViewIfNeeded();
    await pause(page, 2800);
    const pw = page.locator('.account-delete-form input[type="password"]');
    const conf = page.locator(".account-delete-form input").nth(1);
    if (await pw.count()) {
      await pw.fill("demo-not-submitted");
      await pause(page, 900);
    }
    if (await conf.count()) {
      await conf.fill("DELETE");
      await pause(page, 2200);
    }
    // Hold on Delete account UI for reviewers (do NOT submit)
    await pause(page, 3500);
    notes.deletePath = "shown_then_cancelled_without_submit";
  } else {
    notes.deletePath = "delete_section_not_found";
  }

  if (typeof snap === "function") {
    await snap("account_delete_ui");
  }

  await page.locator(".account-settings-modal .auth-close, .auth-close").first().click().catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  await pause(page, 1500);
}

function convertToMp4(webmPath, mp4Path, notes) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg) {
    notes.convert = "ffmpeg_missing";
    return false;
  }
  const r = spawnSync(
    ffmpeg,
    ["-y", "-i", webmPath, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4Path],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.warn("ffmpeg failed", (r.stderr || "").slice(-800));
    notes.convert = "ffmpeg_failed";
    return false;
  }
  notes.convert = "ok";
  notes.ffmpeg = ffmpeg;
  return true;
}

function assembleFromScreenshots(shotDir, mp4Path, notes) {
  const ffmpeg = findFfmpeg();
  const shots = fs
    .readdirSync(shotDir)
    .filter((f) => f.endsWith(".png"))
    .sort();
  if (!ffmpeg || !shots.length) {
    notes.fallback = "no_ffmpeg_or_shots";
    return false;
  }
  const listFile = path.join(shotDir, "concat.txt");
  const lines = [];
  for (const f of shots) {
    const p = path.join(shotDir, f).replace(/\\/g, "/");
    lines.push(`file '${p}'`);
    lines.push("duration 3.2");
  }
  lines.push(`file '${path.join(shotDir, shots[shots.length - 1]).replace(/\\/g, "/")}'`);
  fs.writeFileSync(listFile, lines.join("\n"));
  const r = spawnSync(
    ffmpeg,
    [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listFile,
      "-vf",
      "fps=30,format=yuv420p",
      "-c:v",
      "libx264",
      "-movflags",
      "+faststart",
      mp4Path,
    ],
    { encoding: "utf8" }
  );
  notes.fallback = r.status === 0 ? "screenshot_montage" : "screenshot_montage_failed";
  if (r.status !== 0) console.warn((r.stderr || "").slice(-600));
  return r.status === 0;
}

function probeDuration(mp4Path) {
  const ffmpeg = findFfmpeg();
  if (!ffmpeg || !fs.existsSync(mp4Path)) return null;
  const p = spawnSync(ffmpeg, ["-i", mp4Path], { encoding: "utf8" });
  const m = (p.stderr || "").match(/Duration:\s*(\d+):(\d+):(\d+\.\d+)/);
  if (!m) return null;
  return Math.round(Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]));
}

function writeReadme(notes, stats) {
  const text = `MotiveFX — App Store Review Demo Video
=====================================

VIDEO FILE
  ${OUT_MP4}
  Duration (approx): ${stats.durationSec ?? "n/a"} seconds
  Size: ${stats.sizeMb ?? "n/a"} MB
  Resolution: ${VIEWPORT.width}x${VIEWPORT.height} (iPad Air–ish)

WHAT WAS RECORDED
  Automated browser recording of the MotiveFX terminal WebView (same UI shell as iOS)
  using a local build of apps/web with live API proxy to motivefxai.com.
  Terminal URL used: ${TERMINAL_URL}
  Marketing open: ${MARKETING_URL}

  Flow (in order):
  1. Cold open marketing homepage, then enter terminal
  2. Age gate 18+ — birth year ${BIRTH_YEAR} selected, Continue
  3. Guest / continue without account — Home / Today's Signals core terminal
     (Intel tour + Millennial personalization completed/dismissed so desks are visible)
  4. Navigate Bets (monitor-only odds) — brief scroll
  5. Navigate Predictions (Polymarket / event markets) — brief scroll
  6. Sign in with demo account ${DEMO_EMAIL} — result: ${notes.login}
  7. Account → Delete account UI path — ${notes.deletePath}
     (Password/confirmation fields shown for clarity; Delete was NOT submitted so the demo account remains.)
  8. No purchase / pricing flows opened (N/A for this build)
  9. No ATT / camera / location prompts (none in this WebView flow)

APPLE PHYSICAL-DEVICE CAVEAT (IMPORTANT)
  Apple Guideline 2.1 asked for a recording on a physical device. This deliverable
  was produced on Windows without a local iOS Simulator or attached iPad, so it is
  the best equivalent: a scripted capture of the identical live terminal the app
  WebView loads. If Apple insists on native iOS chrome (status bar / home indicator),
  re-record once on a physical iPad using the shot list below — play this MP4 as a
  timing/reference guide, then screen-record the native app performing the same steps.

HOW TO ATTACH IN APP STORE CONNECT / RESOLUTION CENTER
  1. Open App Store Connect → your app → App Review / Resolution Center for the
     Guideline 2.1 reply thread.
  2. Reply to the message and attach MotiveFX_App_Review_Demo.mp4 (or upload via
     the attachment control in Resolution Center).
  3. In the reply text, note briefly:
       - Demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}
       - Guest path works after age gate without sign-in (open terminal demo)
       - Delete account is reachable under Account; permanent delete requires password + typing DELETE
       - No IAP / purchase flow in this build (monitor-only)
  4. If the file is too large for the reply attachment, host temporarily (e.g. unlisted
     Drive/Dropbox link) and paste the URL in Resolution Center — Apple accepts review
     video links when attachment size is limited.

SHOT LIST (for optional physical iPad re-record)
  1. Force-quit MotiveFX, relaunch cold (splash → age gate or home)
  2. Age gate: choose birth year making user 18+, Continue
  3. Proceed as guest into Home / Today's Signals (~3s hold)
  4. Tap Bets — scroll odds/intel briefly (~3s)
  5. Tap Predictions — scroll markets briefly (~3s)
  6. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}
  7. Open Account — scroll to Delete account — show fields — Cancel/Close (do not delete)
  8. Do not open Pricing / purchase sheets
  9. Stop recording (~60–180s total)

TECH NOTES
  Tooling: Playwright Chromium recordVideo @ ${VIEWPORT.width}x${VIEWPORT.height}
  Source URL: ${TERMINAL_URL}
  Note: Production https://www.motivefxai.com/terminal white-screens after age gate due to
        provider order (WinHookModal/useGenerationalProfile). Local main.tsx was fixed for
        this capture; redeploy terminal to restore production.
  Login status: ${notes.login}
  Delete UI: ${notes.deletePath}
  Convert: ${notes.convert || notes.fallback || "n/a"}
  Generated: ${new Date().toISOString()}
`;
  fs.writeFileSync(OUT_README, text, "utf8");
  fs.copyFileSync(OUT_README, path.join(ASSETS_DIR, "MotiveFX_App_Review_Demo_README.txt"));
  console.log("Wrote README", OUT_README);
}

async function main() {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  ensureDir(WORK);
  ensureDir(ASSETS_DIR);
  const shotDir = path.join(WORK, "shots");
  const videoDir = path.join(WORK, "video");
  ensureDir(shotDir);
  ensureDir(videoDir);
  for (const f of fs.readdirSync(shotDir)) {
    if (f.endsWith(".png") || f === "concat.txt") fs.unlinkSync(path.join(shotDir, f));
  }
  for (const f of fs.readdirSync(videoDir)) {
    try {
      fs.unlinkSync(path.join(videoDir, f));
    } catch {}
  }

  const notes = { login: "not_attempted", deletePath: "n/a", convert: "n/a" };
  const executablePath = findChrome();
  if (!executablePath) throw new Error("Chromium not found");
  console.log("chrome:", executablePath);
  console.log("ffmpeg:", findFfmpeg());

  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--autoplay-policy=no-user-gesture-required"],
  });

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: { dir: videoDir, size: VIEWPORT },
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1 MotiveFX-AppReviewBot/1.0",
  });

  const page = await context.newPage();
  let shotIdx = 0;
  const snap = async (name) => {
    const file = path.join(shotDir, `${String(shotIdx++).padStart(2, "0")}_${name}.png`);
    await page.screenshot({ path: file, fullPage: false });
  };

  try {
    // 1) Cold marketing (production site)
    await page.goto(MARKETING_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
    await pause(page, 3200);
    await snap("marketing_home");

    // Terminal cold with cleared storage (local WebView + live API)
    await page.goto(TERMINAL_URL, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
    await pause(page, 2800);
    await snap("age_gate");

    // 2) Age gate
    await passAgeGate(page);
    await snap("after_age_gate");

    // Wait for terminal chrome
    await page.waitForSelector(".sidebar-item, .workspace-header", { timeout: 45000 });
    await pause(page, 1500);
    await dismissOverlays(page);
    await pause(page, 2000);
    await snap("terminal_ready");

    // 3) Guest home
    await clickNav(page, "Home");
    await dismissOverlays(page);
    await pause(page, 3200);
    await scrollMain(page, 2);
    await snap("home_guest");

    // 4) Bets
    await clickNav(page, "Bets");
    await dismissOverlays(page);
    await pause(page, 3200);
    await scrollMain(page, 3);
    await snap("bets");

    // 5) Predictions
    await clickNav(page, "Predictions");
    await dismissOverlays(page);
    await pause(page, 3200);
    await scrollMain(page, 3);
    await snap("predictions");

    await clickNav(page, "Home");
    await pause(page, 2000);

    // 6) Sign in
    const loggedIn = await tryLogin(page, notes);
    await dismissOverlays(page);
    await pause(page, 2000);
    await snap(loggedIn ? "signed_in" : "sign_in_failed");

    // 7) Account delete path
    if (loggedIn) {
      await dismissOverlays(page);
      await showDeleteAccountPath(page, notes, snap);
      await snap("after_account_close");
    } else {
      notes.deletePath = "skipped_login_failed_guest_only_demo";
    }

    await pause(page, 2800);
    await snap("end");
  } catch (e) {
    console.error("Recording flow error:", e);
    notes.error = String(e.message || e);
    await snap("error").catch(() => {});
  }

  const video = page.video();
  await page.close();
  await context.close();
  await browser.close();

  let webmPath = null;
  if (video) {
    webmPath = await video.path();
    console.log("raw video:", webmPath);
  }

  let delivered = false;
  if (webmPath && fs.existsSync(webmPath)) {
    fs.copyFileSync(webmPath, path.join(ASSETS_DIR, "MotiveFX_App_Review_Demo.webm"));
    delivered = convertToMp4(webmPath, OUT_MP4, notes);
  }

  if (!fs.existsSync(OUT_MP4)) {
    console.log("Falling back to screenshot montage…");
    delivered = assembleFromScreenshots(shotDir, OUT_MP4, notes);
  }

  if (fs.existsSync(OUT_MP4)) {
    fs.copyFileSync(OUT_MP4, path.join(ASSETS_DIR, "MotiveFX_App_Review_Demo.mp4"));
  }

  const durationSec = probeDuration(OUT_MP4);
  const sizeMb = fs.existsSync(OUT_MP4)
    ? (fs.statSync(OUT_MP4).size / (1024 * 1024)).toFixed(2)
    : null;
  writeReadme(notes, { durationSec, sizeMb });

  console.log(JSON.stringify({ delivered, notes, OUT_MP4, durationSec, sizeMb }, null, 2));
  if (!fs.existsSync(OUT_MP4)) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
