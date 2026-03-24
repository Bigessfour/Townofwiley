import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const browserOutputDir = path.resolve('dist/townofwiley-app/browser');
const indexPath = path.join(browserOutputDir, 'index.html');
const routesFilePath = path.resolve('static-routes.txt');

if (!existsSync(indexPath)) {
  throw new Error(`Missing build index at ${indexPath}`);
}

if (!existsSync(routesFilePath)) {
  throw new Error(`Missing route list at ${routesFilePath}`);
}

const routes = readFileSync(routesFilePath, 'utf8')
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith('#'));
const generatedRoutes = [];

for (const route of routes) {
  if (route === '/') {
    continue;
  }

  const relativeRoute = route.replace(/^\/+|\/+$/gu, '');

  if (!relativeRoute) {
    continue;
  }

  const targetDir = path.join(browserOutputDir, ...relativeRoute.split('/'));
  mkdirSync(targetDir, { recursive: true });
  copyFileSync(indexPath, path.join(targetDir, 'index.html'));
  generatedRoutes.push(route);
}

copyFileSync(indexPath, path.join(browserOutputDir, '404.html'));

console.log(
  `Generated static route entrypoints for ${generatedRoutes.length} routes: ${generatedRoutes.join(', ')}`,
);
