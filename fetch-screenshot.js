const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(2000); // let it render
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
