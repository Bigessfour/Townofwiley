/**
 * Converts public/hero-wiley.jpg to WebP at two sizes for responsive srcset.
 * Run once: node scripts/convert-hero.mjs
 * Requires: sharp (npm install sharp --save-dev)
 */
import sharp from 'sharp';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const src = join(publicDir, 'hero-wiley.jpg');

const outputs = [
  { file: 'hero-wiley-800.webp', width: 800 },
  { file: 'hero-wiley.webp', width: 1184 },
];

for (const { file, width } of outputs) {
  const dest = join(publicDir, file);
  const info = await sharp(src).resize(width).webp({ quality: 82 }).toFile(dest);
  console.log(`✓ ${file}  ${(info.size / 1024).toFixed(0)} KB`);
}
