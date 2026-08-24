const { chromium } = require("playwright");

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  page.on("pageerror", (e) => console.log("ERR", e.message));
  await page.goto("http://127.0.0.1:5280/", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  console.log("age", await page.locator(".age-gate-overlay").isVisible());
  await page.locator('select[aria-label="Birth year"]').selectOption("1990");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(4000);
  console.log("sidebar", await page.locator(".sidebar-item").count());
  console.log("text", (await page.innerText("body")).slice(0, 300));
  await page.screenshot({
    path: "C:/Users/Mazen/Documents/motivefx-ai/scripts/app-review-demo/debug_local.png",
  });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
