/** Returns true when an AWSDate notice should still appear on the public site. */
export function isNoticeDateStillVisible(
  dateStr: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  const cleaned = typeof dateStr === 'string' ? dateStr.trim() : '';
  if (!cleaned) {
    return true;
  }

  // YYYY-MM-DD (AppSync AWSDate): visible through end of that local calendar day.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const endOfDay = new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999);
    return endOfDay.getTime() >= nowMs;
  }

  const parsed = Date.parse(cleaned);
  return Number.isNaN(parsed) || parsed >= nowMs;
}
