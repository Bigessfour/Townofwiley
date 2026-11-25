import { describe, expect, it } from 'vitest';

/** WCAG 2.1 relative luminance contrast. */
export function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

const textPairs = [
  ['light body ink on page', '#1c2b26', '#faf6f0'],
  ['light link on page', '#1a3c34', '#faf6f0'],
  ['light placeholder on field', '#5c6f66', '#ffffff'],
  ['dark body ink on page', '#f4f7f2', '#061f18'],
  ['dark link on page', '#d5e8df', '#061f18'],
  ['dark link on card', '#d5e8df', '#12352c'],
  ['dark placeholder on field', '#8fa89c', '#12352c'],
  ['forest on gold button', '#061f18', '#c4923a'],
  ['forest on gold button hover', '#061f18', '#b8860b'],
  ['header label on forest', '#ffffff', '#0f3d2e'],
] as const;

const boundaryPairs = [
  ['light field border on white', '#5c6f66', '#ffffff'],
  ['dark field border on card', '#6fa892', '#12352c'],
] as const;

describe('Wiley theme contrast', () => {
  it('keeps text and button labels at WCAG AA 4.5:1', () => {
    for (const [name, foreground, background] of textPairs) {
      expect(contrastRatio(foreground, background), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('keeps field boundaries at WCAG 3:1', () => {
    for (const [name, foreground, background] of boundaryPairs) {
      expect(contrastRatio(foreground, background), name).toBeGreaterThanOrEqual(3);
    }
  });
});
