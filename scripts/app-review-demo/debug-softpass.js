const { chromium } = require("playwright");

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  const chrome = "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  // Load with age already verified — avoid remount crash path
  await page.goto("https://www.motivefxai.com/terminal/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem("motivefx_age_verified", "1");
    localStorage.setItem("motivefx_intel_tour_seen", "1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(5000);
  console.log("text", await page.evaluate(() => (document.body.innerText || "").slice(0, 500)));
  console.log(
    "sidebar",
    await page.evaluate(() =>
      [...document.querySelectorAll(".sidebar-item")].map((b) => (b.textContent || "").trim().replace(/\s+/g, " "))
    )
  );
  await page.screenshot({ path: "debug_preverified.png" });

  // Now simulate showing age gate visually by injecting overlay? Better: fresh context show gate then soft-pass via localStorage+reload
  await browser.close();

  const browser2 = await chromium.launch({ headless: true, executablePath: chrome });
  const page2 = await browser2.newPage({ viewport: { width: 1180, height: 820 } });
  page2.on("pageerror", (e) => console.log("PAGEERROR2", e.message));
  await page2.goto("https://www.motivefxai.com/terminal/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page2.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page2.reload({ waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(2500);
  await page2.locator('select[aria-label="Birth year"]').selectOption("1990");
  await page2.waitForTimeout(1500);
  // Soft-pass: set storage and hard reload instead of React Continue
  await page2.evaluate(() => {
    localStorage.setItem("motivefx_age_verified", "1");
  });
  await page2.screenshot({ path: "debug_gate_filled.png" });
  await page2.reload({ waitUntil: "domcontentloaded" });
  await page2.waitForTimeout(5000);
  console.log(
    "softpass sidebar",
    await page2.evaluate(() =>
      [...document.querySelectorAll(".sidebar-item")].map((b) => (b.textContent || "").trim().replace(/\s+/g, " "))
    )
  );
  await page2.screenshot({ path: "debug_softpass.png" });
  await browser2.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
