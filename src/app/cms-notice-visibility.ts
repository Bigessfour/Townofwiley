/** Town calendar zone for AppSync AWSDate fields (YYYY-MM-DD without time). */
const TOWN_NOTICE_TIME_ZONE = 'America/Denver';

interface TownCalendarParts {
  year: number;
  month: number;
  day: number;
}

/** Returns true when an AWSDate notice should still appear on the public site. */
export function isNoticeDateStillVisible(
  dateStr: string | null | undefined,
  nowMs = Date.now(),
): boolean {
  const cleaned = typeof dateStr === 'string' ? dateStr.trim() : '';
  if (!cleaned) {
    return true;
  }

  // YYYY-MM-DD (AppSync AWSDate): visible through end of that town calendar day.
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const endOfDay = endOfTownCalendarDayMs(Number(year), Number(month), Number(day));
    return endOfDay >= nowMs;
  }

  const parsed = Date.parse(cleaned);
  return Number.isNaN(parsed) || parsed >= nowMs;
}

function townCalendarParts(ms: number): TownCalendarParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TOWN_NOTICE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(ms));

  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
  };
}

function isOnTownCalendarDay(
  parts: TownCalendarParts,
  year: number,
  month: number,
  day: number,
): boolean {
  return parts.year === year && parts.month === month && parts.day === day;
}

function isBeforeTownCalendarDay(
  parts: TownCalendarParts,
  year: number,
  month: number,
  day: number,
): boolean {
  if (parts.year !== year) {
    return parts.year < year;
  }
  if (parts.month !== month) {
    return parts.month < month;
  }
  return parts.day < day;
}

/** Last millisecond of a YYYY-MM-DD calendar day in America/Denver. */
function endOfTownCalendarDayMs(year: number, month: number, day: number): number {
  let lo = Date.UTC(year, month - 1, day, 0, 0, 0, 0) - 12 * 3_600_000;
  let hi = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + 36 * 3_600_000;
  let best = lo;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const parts = townCalendarParts(mid);

    if (isOnTownCalendarDay(parts, year, month, day)) {
      best = mid;
      lo = mid + 1;
      continue;
    }

    if (isBeforeTownCalendarDay(parts, year, month, day)) {
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  return best;
}
