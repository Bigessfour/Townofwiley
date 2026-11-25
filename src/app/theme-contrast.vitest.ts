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
  ['light body ink on page', '#2a2927', '#f2f1ed'],
  ['light link on page', '#3f3d3b', '#f2f1ed'],
  ['light placeholder on field', '#5c5a57', '#ffffff'],
  ['dark body ink on page', '#fafafa', '#09090b'],
  ['dark link on page', '#2ab5d7', '#09090b'],
  ['dark link on card', '#2ab5d7', '#18181b'],
  ['dark muted text on card', '#a1a1aa', '#18181b'],
  ['dark placeholder on field', '#a1a1aa', '#18181b'],
  ['ink on gold button', '#161514', '#c4923a'],
  ['ink on gold button hover', '#161514', '#b8860b'],
  ['ink on dark gold button', '#09090b', '#edb657'],
  ['header label on charcoal', '#ffffff', '#2a2927'],
  ['header label on zinc', '#fafafa', '#18181b'],
] as const;

const boundaryPairs = [
  ['light field border on white', '#5c5a57', '#ffffff'],
  ['dark field border on card', '#a1a1aa', '#18181b'],
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
