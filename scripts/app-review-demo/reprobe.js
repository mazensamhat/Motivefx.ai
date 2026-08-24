const { chromium } = require("playwright");
const fs = require("fs");

async function main() {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  const executablePath =
    "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));

  await page.goto("https://www.motivefxai.com/terminal/", {
    waitUntil: "domcontentloaded",
    timeout: 90000,
  });
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
  console.log("age", age);
  if (age) {
    await page.locator('select[aria-label="Birth year"]').selectOption("1990");
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(4000);
  }

  const info = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    hasSidebar: !!document.querySelector(".sidebar-item"),
    buttons: [...document.querySelectorAll("button")]
      .map((b) => (b.textContent || "").trim().replace(/\s+/g, " "))
      .filter(Boolean)
      .slice(0, 40),
    textSample: (document.body?.innerText || "").slice(0, 500),
    rootHTML: document.getElementById("root")?.innerHTML?.slice(0, 300),
  }));
  console.log(JSON.stringify(info, null, 2));

  // Try alternate entry points
  for (const url of [
    "https://www.motivefxai.com/terminal/index.html",
    "https://motivefxai.com/terminal/",
    "https://www.motivefxai.com/demo",
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch((e) =>
      console.log("fail", url, e.message)
    );
    await page.waitForTimeout(3000);
    console.log(
      "alt",
      url,
      page.url(),
      "sidebar",
      await page.locator(".sidebar-item").count(),
      "text",
      (await page.evaluate(() => document.body?.innerText || "")).slice(0, 120).replace(/\n/g, " ")
    );
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
