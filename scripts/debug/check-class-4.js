const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:54579');
  await page.waitForTimeout(1000);
  const layout = await page.evaluate(() => {
    const end = document.querySelector('.p-megamenu-end');
    const children = Array.from(end.firstElementChild.children).map(c => ({ tag: c.tagName, cls: c.className, h: c.getBoundingClientRect().height }));
    return children;
  });
  console.dir(layout);
  await browser.close();
})();
