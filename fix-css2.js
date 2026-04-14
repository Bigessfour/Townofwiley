const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(1000);
  const dir = await page.evaluate(() => {
    const list = document.querySelector('.p-megamenu-root-list');
    return window.getComputedStyle(list).flexDirection;
  });
  console.log("direction is: " + dir);
  await browser.close();
})();
