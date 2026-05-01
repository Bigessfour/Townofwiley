import { describe, expect, it } from 'vitest';
import { sanitizePlainText } from './input-sanitization';

describe('sanitizePlainText', () => {
  it('trims, removes NUL, and collapses whitespace', () => {
    expect(sanitizePlainText('  hello\u0000\n\tworld  ', 100)).toBe('hello world');
  });

  it('respects max length', () => {
    expect(sanitizePlainText('abcdefghij', 4)).toBe('abcd');
  });

  it('handles non-strings', () => {
    expect(sanitizePlainText(null as unknown as string, 10)).toBe('');
  });
});
