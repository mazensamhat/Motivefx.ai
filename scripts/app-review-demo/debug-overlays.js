const { chromium } = require("playwright");
const fs = require("fs");

(async () => {
  process.env.PLAYWRIGHT_BROWSERS_PATH = "C:\\Users\\Mazen\\AppData\\Local\\ms-playwright";
  const chrome = "C:/Users/Mazen/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe";
  const browser = await chromium.launch({ headless: true, executablePath: chrome });
  const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
  await page.goto("https://www.motivefxai.com/terminal/", { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2000);
  await page.locator('select[aria-label="Birth year"]').selectOption("1990");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(3000);

  for (let i = 0; i < 8; i++) {
    const next = page.getByRole("button", { name: /^Next$/i });
    if (await next.isVisible().catch(() => false)) {
      await next.click();
      await page.waitForTimeout(700);
    } else break;
  }

  await page.screenshot({ path: "debug_after_tour.png" });

  // Try close gen setup
  const apply = page.getByRole("button", { name: /APPLY .* EXPERIENCE/i });
  const closeBtns = page.locator('button[aria-label="Close"]');
  console.log("apply visible", await apply.isVisible().catch(() => false));
  console.log("close count", await closeBtns.count());

  const info = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll("button")]
      .map((b) => ({
        text: (b.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
        aria: b.getAttribute("aria-label"),
        cls: (b.className || "").toString().slice(0, 80),
      }))
      .filter((b) => b.text || b.aria)
      .slice(0, 80),
    overlays: [...document.querySelectorAll(".gen-setup-overlay, .intel-tour, [role=dialog]")]
      .map((el) => el.className),
  }));
  fs.writeFileSync("debug_dom.json", JSON.stringify(info, null, 2));
  console.log(JSON.stringify(info, null, 2));

  // complete millennial if present
  const millennial = page.getByText(/Millennial/i).first();
  if (await millennial.isVisible().catch(() => false)) {
    await millennial.click();
    await page.waitForTimeout(500);
  }
  if (await apply.isVisible().catch(() => false)) {
    await apply.click();
    await page.waitForTimeout(1500);
  } else {
    while ((await closeBtns.count()) > 0 && (await closeBtns.first().isVisible().catch(() => false))) {
      await closeBtns.first().click().catch(() => {});
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: "debug_cleared.png" });
  const after = await page.evaluate(() => ({
    sidebar: [...document.querySelectorAll(".sidebar-item")].map((b) =>
      (b.textContent || "").trim().replace(/\s+/g, " ")
    ),
    signIn: [...document.querySelectorAll("button")]
      .map((b) => (b.textContent || "").trim())
      .filter((t) => /sign in/i.test(t)),
  }));
  console.log("AFTER", JSON.stringify(after, null, 2));

  await page.locator(".sidebar-item", { hasText: "Bets" }).first().click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: "debug_bets.png" });
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
