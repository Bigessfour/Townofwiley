import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const baseUrl = process.env.AUDIT_BASE_URL ?? 'http://127.0.0.1:4300';
const routes = [
  '/',
  '/notices',
  '/meetings',
  '/weather',
  '/records',
  '/services',
  '/documents',
  '/businesses',
  '/news',
  '/contact',
  '/accessibility',
  '/privacy',
  '/terms',
];
const viewports = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'mobile', width: 390, height: 844 },
];
const screenshotTargets = new Set([
  'desktop:/',
  'mobile:/',
  'mobile:/services',
  'desktop:/weather',
]);
const printRoutes = ['/notices', '/meetings', '/records', '/documents'];
const outlineCss = `
  * { outline: 1px solid rgba(236, 72, 153, .35) !important; outline-offset: -1px !important; }
  *:nth-child(3n) { outline-color: rgba(14, 165, 233, .35) !important; }
  *:nth-child(3n+1) { outline-color: rgba(34, 197, 94, .35) !important; }
`;

function compactClassName(value) {
  return String(value || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .join('.');
}

const browser = await chromium.launch();
const findings = [];
const localOrigin = new URL(baseUrl).origin;

async function guardExternalNetwork(page) {
  await page.route('**/*', (route) => {
    const requestUrl = route.request().url();
    if (
      requestUrl.startsWith(localOrigin) ||
      requestUrl.startsWith('data:') ||
      requestUrl.startsWith('blob:')
    ) {
      return route.continue();
    }

    return route.abort();
  });
}

async function runRouteStep(label, callback) {
  const timeout = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out`)), 20000);
  });
  return Promise.race([callback(), timeout]);
}

for (const viewport of viewports) {
  for (const route of routes) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
    });
    await guardExternalNetwork(page);

    try {
      await runRouteStep(`${viewport.name} ${route}`, async () => {
        await page.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 15000 });
        await page.waitForLoadState('domcontentloaded', { timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(750);
        await page.addStyleTag({ content: outlineCss }).catch(() => undefined);

        if (screenshotTargets.has(`${viewport.name}:${route}`)) {
          const safeRoute = route === '/' ? 'home' : route.slice(1).replaceAll('/', '-');
          await page.screenshot({
            path: `artifacts/debug/visual-box-${viewport.name}-${safeRoute}.png`,
            fullPage: false,
          });
        }

        const data = await page.evaluate(() => {
          const visible = [...document.querySelectorAll('body *')].filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0
            );
          });
          const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((heading) => ({
            level: Number(heading.tagName.slice(1)),
            text: heading.textContent?.trim().replace(/\s+/g, ' ').slice(0, 90) ?? '',
          }));
          const jumps = [];
          for (let index = 1; index < headings.length; index += 1) {
            if (headings[index].level - headings[index - 1].level > 1) {
              jumps.push(
                `${headings[index - 1].level}->${headings[index].level}: ${headings[index].text}`,
              );
            }
          }
          const viewportWidth = innerWidth;
          const overflowX =
            Math.max(document.body.scrollWidth, document.documentElement.scrollWidth) -
            viewportWidth;
          const offscreen = visible
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              if (getComputedStyle(element).position === 'fixed') return false;
              return rect.left < -1 || rect.right > viewportWidth + 1;
            })
            .slice(0, 4)
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                className: String(element.className || ''),
                left: Math.round(rect.left),
                right: Math.round(rect.right),
              };
            });
          const clipped = visible
            .filter((element) => {
              const style = getComputedStyle(element);
              const tag = element.tagName.toLowerCase();
              if (!element.textContent?.trim() || ['script', 'style', 'svg', 'path'].includes(tag))
                return false;
              return (
                (style.overflow === 'hidden' || style.textOverflow === 'ellipsis') &&
                element.scrollWidth > element.clientWidth + 2
              );
            })
            .slice(0, 4)
            .map((element) => ({
              tag: element.tagName.toLowerCase(),
              className: String(element.className || ''),
              text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70) ?? '',
            }));
          const smallTargets = visible
            .filter((element) => {
              const tag = element.tagName.toLowerCase();
              const role = element.getAttribute('role');
              const interactive =
                ['a', 'button', 'input', 'select', 'textarea'].includes(tag) ||
                ['button', 'link', 'tab', 'menuitem'].includes(role ?? '');
              if (!interactive) return false;
              const rect = element.getBoundingClientRect();
              return rect.width < 36 || rect.height < 36;
            })
            .slice(0, 6)
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                tag: element.tagName.toLowerCase(),
                role: element.getAttribute('role'),
                className: String(element.className || ''),
                label:
                  element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 70) ||
                  element.getAttribute('aria-label') ||
                  '',
                width: Math.round(rect.width),
                height: Math.round(rect.height),
              };
            });
          return {
            innerWidth,
            overflowX: Math.round(overflowX),
            h1Count: headings.filter((heading) => heading.level === 1).length,
            jumps,
            offscreen,
            clipped,
            smallTargets,
          };
        });

        const issues = [];
        if (data.overflowX > 2) issues.push(`horizontal overflow ${data.overflowX}px`);
        if (data.h1Count !== 1) issues.push(`h1 count ${data.h1Count}`);
        if (data.jumps.length > 0) issues.push(`heading jumps: ${data.jumps.join(' | ')}`);
        const meaningfulOffscreen = data.offscreen.filter(
          (item) =>
            !item.className.includes('sr-only') &&
            !item.className.includes('hero-landing-media') &&
            item.tag !== 'img',
        );
        if (meaningfulOffscreen.length > 0) {
          issues.push(
            `offscreen boxes: ${meaningfulOffscreen
              .map(
                (item) =>
                  `${item.tag}.${compactClassName(item.className)} ${item.left}-${item.right}`,
              )
              .join(' | ')}`,
          );
        }
        const meaningfulClipped = data.clipped.filter(
          (item) =>
            !item.className.includes('sr-only') &&
            !item.className.includes('fc-event-title') &&
            !item.className.includes('hero-landing'),
        );
        if (meaningfulClipped.length > 0) {
          issues.push(
            `clipped text: ${meaningfulClipped
              .map((item) => `${item.tag}.${compactClassName(item.className)} ${item.text}`)
              .join(' | ')}`,
          );
        }
        const meaningfulTargets = data.smallTargets.filter(
          (item) =>
            !item.className.includes('skip-link') &&
            item.role !== 'menuitem' &&
            !item.className.includes('fc-col-header-cell-cushion'),
        );
        if (meaningfulTargets.length > 0) {
          issues.push(
            `small tap targets: ${meaningfulTargets
              .map(
                (item) =>
                  `${item.tag}.${compactClassName(item.className)} ${item.width}x${item.height} ${item.label}`,
              )
              .join(' | ')}`,
          );
        }
        if (issues.length > 0) {
          findings.push({ viewport: viewport.name, route, width: data.innerWidth, issues });
        }
      });
    } catch (error) {
      findings.push({
        viewport: viewport.name,
        route,
        width: viewport.width,
        issues: [error instanceof Error ? error.message : String(error)],
      });
    } finally {
      page.close().catch(() => undefined);
    }
  }
}

for (const route of printRoutes) {
  const printPage = await browser.newPage({ viewport: { width: 816, height: 1056 } });
  await guardExternalNetwork(printPage);

  try {
    await printPage.emulateMedia({ media: 'print' });
    await runRouteStep(`print ${route}`, async () => {
      await printPage.goto(`${baseUrl}${route}`, { waitUntil: 'commit', timeout: 15000 });
      await printPage
        .waitForLoadState('domcontentloaded', { timeout: 5000 })
        .catch(() => undefined);
      await printPage.waitForTimeout(750);

      const printData = await printPage.evaluate(() => {
        const viewportWidth = innerWidth;
        const scrollWidth = Math.max(
          document.body.scrollWidth,
          document.documentElement.scrollWidth,
        );
        const wideElements = [...document.querySelectorAll('body *')]
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > viewportWidth + 2
            );
          })
          .slice(0, 4)
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              tag: element.tagName.toLowerCase(),
              className: String(element.className || ''),
              width: Math.round(rect.width),
            };
          });

        return {
          overflowX: Math.round(scrollWidth - viewportWidth),
          wideElements,
        };
      });

      const issues = [];
      if (printData.overflowX > 2)
        issues.push(`print horizontal overflow ${printData.overflowX}px`);
      if (printData.wideElements.length > 0) {
        issues.push(
          `print wide boxes: ${printData.wideElements
            .map((item) => `${item.tag}.${compactClassName(item.className)} ${item.width}px`)
            .join(' | ')}`,
        );
      }
      if (issues.length > 0) {
        findings.push({ viewport: 'print-letter', route, width: 816, issues });
      }
    });
  } catch (error) {
    findings.push({
      viewport: 'print-letter',
      route,
      width: 816,
      issues: [error instanceof Error ? error.message : String(error)],
    });
  } finally {
    printPage.close().catch(() => undefined);
  }
}

const output = `${JSON.stringify(findings, null, 2)}\n`;
await writeFile('artifacts/debug/visual-box-audit-output.json', output);
console.log(output);
process.exit(0);
