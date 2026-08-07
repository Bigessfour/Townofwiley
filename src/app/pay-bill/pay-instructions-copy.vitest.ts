import { describe, expect, it } from 'vitest';
import { payInstructionsCopy } from './pay-instructions-copy';

describe('payInstructionsCopy', () => {
  it('returns English Paystar instruction assets', () => {
    const copy = payInstructionsCopy('en');
    expect(copy.imageSrc).toBe('/pay-bill-instructions-en.jpg');
    expect(copy.imageAlt).toMatch(/Paystar/i);
  });

  it('returns Spanish Paystar instruction assets', () => {
    const copy = payInstructionsCopy('es');
    expect(copy.imageSrc).toBe('/pay-bill-instructions-es-v2.jpg');
    expect(copy.imageAlt).toMatch(/Paystar/i);
  });
});
