/**
 * Debug where /app vs /terminal land after age gate.
 */
const fs = require("fs");
const { chromium } = require("playwright");

const chromeCandidates = [
  "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  "C:/Users/Mazen/AppData/Local/Temp/cursor-sandbox-cache/8df1da9df054aa6ef6011b8c73cc9dfa/playwright/chromium-1234/chrome-win64/chrome.exe",
];

(async () => {
  const executablePath = chromeCandidates.find((p) => fs.existsSync(p));
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

  for (const url of [
    "https://www.motivefxai.com/app",
    "https://www.motivefxai.com/terminal/",
    "https://www.motivefxai.com/demo",
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.reload({ waitUntil: "networkidle", timeout: 90000 }).catch(() =>
      page.reload({ waitUntil: "domcontentloaded", timeout: 90000 })
    );
    await page.waitForTimeout(3000);

    const age = await page.locator(".age-gate-overlay").isVisible().catch(() => false);
    if (age) {
      await page.locator('select[aria-label="Birth year"]').selectOption("1990");
      await page.getByRole("button", { name: "Continue" }).click();
      await page.waitForTimeout(4000);
    }

    const info = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      hasSidebar: !!document.querySelector(".sidebar-item"),
      hasBottom: !!document.querySelector(".mobile-bottom-nav"),
      hasWorkspace: !!document.querySelector(".workspace-header"),
      hasAccount: !!document.querySelector(".account-menu"),
      buttons: [...document.querySelectorAll("button")]
        .map((b) => (b.textContent || "").trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .slice(0, 40),
      textSample: (document.body?.innerText || "").slice(0, 500),
    }));
    console.log("\n===", url, "===\n", JSON.stringify(info, null, 2));
  }

  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
