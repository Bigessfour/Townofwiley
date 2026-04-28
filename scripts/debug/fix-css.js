const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(2000);
  const styles = await page.evaluate(() => {
    const list = document.querySelector('.p-megamenu-root-list');
    return window.getComputedStyle(list).display;
  });
  console.log("p-megamenu-root-list display: ", styles);
  await browser.close();
})();
