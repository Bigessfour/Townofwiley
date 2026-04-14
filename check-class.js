const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(1000);
  const layout = await page.evaluate(() => {
    const list = document.querySelector('.p-megamenu-root-list');
    return list.getBoundingClientRect().toJSON();
  });
  const rootLayout = await page.evaluate(() => {
    return document.querySelector('p-megamenu').getBoundingClientRect().toJSON();
  });
  console.log("list", layout);
  console.log("root container", rootLayout);
  
  await browser.close();
})();
