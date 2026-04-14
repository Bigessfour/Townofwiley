const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(2000);
  const outerHtml = await page.evaluate(() => document.querySelector('p-megamenu').outerHTML);
  console.log(outerHtml.substring(0, 1500));
  await browser.close();
})();
