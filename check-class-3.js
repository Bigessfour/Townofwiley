const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(1000);
  const layout = await page.evaluate(() => {
    return {
      start: document.querySelector('.p-megamenu-start').getBoundingClientRect().toJSON(),
      end: document.querySelector('.p-megamenu-end').getBoundingClientRect().toJSON()
    };
  });
  console.dir(layout);
  await browser.close();
})();
