const { chromium } = require("playwright");

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  const chrome = "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

  page.on("console", (m) => console.log("CONSOLE", m.type(), m.text()));
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) console.log("NAV", f.url());
  });

  await page.goto("https://www.motivefxai.com/terminal/", { waitUntil: "domcontentloaded", timeout: 90000 });
  console.log("url1", page.url());
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle", timeout: 90000 }).catch(async () => {
    await page.reload({ waitUntil: "domcontentloaded" });
  });
  await page.waitForTimeout(4000);
  console.log("url2", page.url(), "age", await page.locator(".age-gate-overlay").isVisible());

  await page.locator('select[aria-label="Birth year"]').selectOption("1990");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(5000);
  console.log("url3", page.url());
  console.log("html len", await page.evaluate(() => document.body.innerHTML.length));
  console.log("text", await page.evaluate(() => (document.body.innerText || "").slice(0, 800)));
  await page.screenshot({ path: "debug_step.png", fullPage: true });

  // Close tour via aria
  const closeTour = page.getByRole("button", { name: /Close tour/i });
  if (await closeTour.isVisible().catch(() => false)) {
    console.log("closing tour");
    await closeTour.click();
    await page.waitForTimeout(2000);
  }

  console.log("text2", await page.evaluate(() => (document.body.innerText || "").slice(0, 800)));
  await page.screenshot({ path: "debug_step2.png" });

  const dismiss = page.getByRole("button", { name: /Dismiss/i });
  if (await dismiss.isVisible().catch(() => false)) {
    console.log("dismiss gen");
    await dismiss.click();
    await page.waitForTimeout(2000);
  }

  // Also try clicking Millennial + Apply
  const mill = page.locator(".gen-setup-cohort", { hasText: "Millennial" });
  if (await mill.count()) {
    await mill.click();
    await page.waitForTimeout(500);
    await page.locator(".gen-setup-confirm").click();
    await page.waitForTimeout(2000);
  }

  console.log("text3", await page.evaluate(() => (document.body.innerText || "").slice(0, 800)));
  console.log(
    "sidebar",
    await page.evaluate(() =>
      [...document.querySelectorAll(".sidebar-item")].map((b) => (b.textContent || "").trim())
    )
  );
  await page.screenshot({ path: "debug_step3.png" });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
