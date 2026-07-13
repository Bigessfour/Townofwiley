/**
 * Builds `public/hero-wiley.webp` and `public/hero-wiley-800.webp` from a source image.
 *
 * Resolution order for source:
 * 1. `--input <path>` (relative to repo root or absolute)
 * 2. First positional argument (relative to repo root or absolute)
 * 3. `Photos/Wley,_Colorado.JPG` or `Photos/wiley01.webp` when present
 * 4. `public/hero-wiley.jpg` (legacy)
 *
 * Usage:
 *   npm run assets:hero
 *   npm run assets:hero -- --input Photos/wiley02.webp
 */
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const publicDir = join(rootDir, 'public');

function resolveSourcePath(raw) {
  if (!raw) {
    return null;
  }
  return raw.startsWith('/') ? raw : join(rootDir, raw);
}

function parseCliSource() {
  const argv = process.argv.slice(2);
  const flagIdx = argv.indexOf('--input');
  if (flagIdx !== -1 && argv[flagIdx + 1]) {
    return resolveSourcePath(argv[flagIdx + 1]);
  }
  const first = argv.find((a) => !a.startsWith('-'));
  if (first) {
    return resolveSourcePath(first);
  }
  return null;
}

const defaultPhotoJpg = join(rootDir, 'Photos', 'Wley,_Colorado.JPG');
const defaultWebp = join(rootDir, 'Photos', 'wiley01.webp');
const fallbackJpg = join(publicDir, 'hero-wiley.jpg');

const src =
  parseCliSource() ??
  (existsSync(defaultPhotoJpg)
    ? defaultPhotoJpg
    : existsSync(defaultWebp)
      ? defaultWebp
      : existsSync(fallbackJpg)
        ? fallbackJpg
        : null);

if (!src || !existsSync(src)) {
  console.error('No hero source image found.');
  console.error(
    'Add Photos/wiley01.webp, or public/hero-wiley.jpg, or pass: npm run assets:hero -- --input Photos/your.webp',
  );
  process.exit(1);
}

const outputs = [
  { file: 'hero-wiley-800.webp', width: 800 },
  { file: 'hero-wiley.webp', width: 1184 },
];

console.log(`Source: ${src}`);

for (const { file, width } of outputs) {
  const dest = join(publicDir, file);
  const info = await sharp(src).resize(width).webp({ quality: 82 }).toFile(dest);
  console.log(`✓ ${file}  ${(info.size / 1024).toFixed(0)} KB`);
}
