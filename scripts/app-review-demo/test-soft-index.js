const { chromium } = require("playwright");

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  const chrome = "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  page.on("pageerror", (e) => console.log("ERR", e.message));

  await page.goto("https://www.motivefxai.com/terminal/index.html", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);
  console.log("age", await page.locator(".age-gate-overlay").isVisible());
  await page.locator('select[aria-label="Birth year"]').selectOption("1990");
  await page.waitForTimeout(1500);
  // Soft pass — avoid Continue remount crash on current bundle
  await page.evaluate(() => {
    localStorage.setItem("motivefx_age_verified", "1");
    localStorage.setItem("motivefx_intel_tour_seen", "0"); // show tour in video once
    localStorage.setItem("motivefx_gen_cohort", "millennial");
    localStorage.setItem("motivefx_profile_done", "1"); // skip gen setup for stability
  });
  await page.goto("https://www.motivefxai.com/terminal/index.html", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
  await page.waitForTimeout(5000);
  console.log(
    "sidebar",
    await page.evaluate(() =>
      [...document.querySelectorAll(".sidebar-item")].map((b) =>
        (b.textContent || "").trim().replace(/\s+/g, " ")
      )
    )
  );
  console.log("text", (await page.evaluate(() => document.body.innerText || "")).slice(0, 300));
  await page.screenshot({ path: "debug_index_soft.png" });

  // tour close
  const closeTour = page.getByRole("button", { name: /Close tour/i });
  if (await closeTour.isVisible().catch(() => false)) await closeTour.click();
  await page.waitForTimeout(1000);

  await page.evaluate(() => {
    const el = [...document.querySelectorAll(".sidebar-item")].find((n) =>
      (n.textContent || "").includes("Bets")
    );
    el && el.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "debug_index_bets.png" });
  console.log("bets text", (await page.evaluate(() => document.body.innerText || "")).slice(0, 200));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
