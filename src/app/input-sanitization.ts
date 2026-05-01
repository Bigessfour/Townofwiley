/**
 * Hardens user-supplied single-line text before HTTP payloads or display.
 * Strips NUL / C0 controls (except whitespace), collapses whitespace, trims, caps length.
 */
export function sanitizePlainText(value: string, maxLength: number): string {
  if (typeof value !== 'string') {
    return '';
  }
  const withoutControls = [...value]
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      if (c === 0 || c === 127) {
        return false;
      }
      if (c >= 1 && c <= 8) {
        return false;
      }
      if (c === 11 || c === 12) {
        return false;
      }
      if (c >= 14 && c <= 31) {
        return false;
      }
      return true;
    })
    .join('');
  return withoutControls
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, Math.max(0, maxLength));
}
