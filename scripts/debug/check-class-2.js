const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(1000);
  const dir = await page.evaluate(() => {
    const el = document.querySelector('.p-megamenu');
    const computed = window.getComputedStyle(el);
    return { display: computed.display, flexDirection: computed.flexDirection, alignItems: computed.alignItems, width: computed.width };
  });
  console.log(dir);
  await browser.close();
})();
