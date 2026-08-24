/**
 * Quick DOM probe of live MotiveFX for App Review recording selectors.
 */
const { chromium } = require("playwright");

async function main() {
  const chromeCandidates = [
    "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
    "C:/Users/Mazen/AppData/Local/Temp/cursor-sandbox-cache/8df1da9df054aa6ef6011b8c73cc9dfa/playwright/chromium-1234/chrome-win64/chrome.exe",
  ];
  const fs = require("fs");
  const executablePath = chromeCandidates.find((p) => fs.existsSync(p));
  if (!executablePath) throw new Error("No Chromium executable found");
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  const log = [];

  page.on("console", (m) => {
    if (m.type() === "error") log.push("console:" + m.text());
  });

  await page.goto("https://www.motivefxai.com/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  log.push("home_url=" + page.url());
  log.push("home_title=" + (await page.title()));

  const homeLinks = await page.evaluate(() =>
    [...document.querySelectorAll("a")]
      .map((a) => ({ href: a.getAttribute("href"), text: (a.textContent || "").trim().slice(0, 60) }))
      .filter((a) => /terminal|app|launch|open|sign|start|demo/i.test(`${a.href} ${a.text}`))
      .slice(0, 40)
  );
  log.push("home_links=" + JSON.stringify(homeLinks, null, 2));

  await page.goto("https://www.motivefxai.com/terminal/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(3500);
  log.push("terminal_url=" + page.url());
  log.push("terminal_title=" + (await page.title()));

  const snapshot = await page.evaluate(() => {
    const age = !!document.querySelector(".age-gate-overlay, [aria-labelledby='age-gate-title']");
    const auth = !!document.querySelector(".auth-overlay, .auth-modal");
    const buttons = [...document.querySelectorAll("button")]
      .map((b) => (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80))
      .filter(Boolean)
      .slice(0, 60);
    const nav = [...document.querySelectorAll(".sidebar-item, .mobile-bottom-nav-item, .mobile-header-tool")]
      .map((b) => (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80));
    const h1 = [...document.querySelectorAll("h1,h2")].map((h) => (h.textContent || "").trim()).slice(0, 15);
    return { age, auth, buttons, nav, h1, bodyLen: document.body?.innerText?.length || 0 };
  });
  log.push("terminal_snapshot=" + JSON.stringify(snapshot, null, 2));

  // Clear age + reload cold
  await page.evaluate(() => {
    try {
      localStorage.removeItem("motivefx_age_verified");
      sessionStorage.clear();
    } catch {}
  });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForTimeout(2500);
  const afterClear = await page.evaluate(() => ({
    age: !!document.querySelector(".age-gate-overlay"),
    title: document.querySelector("#age-gate-title")?.textContent || null,
    select: !!document.querySelector('select[aria-label="Birth year"]'),
  }));
  log.push("after_clear=" + JSON.stringify(afterClear));

  console.log(log.join("\n\n"));
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
