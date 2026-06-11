/** Convert between AppSync ISO datetimes and native datetime-local input values. */

export function isoToDatetimeLocal(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) {
    return '';
  }
  const date = new Date(parsed);
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function datetimeLocalToIso(localValue: string): string {
  const parsed = Date.parse(localValue);
  if (Number.isNaN(parsed)) {
    throw new Error('Enter a valid date and time.');
  }
  return new Date(parsed).toISOString();
}

export function isoToDateInput(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) {
    return isoOrDate;
  }
  // AppSync AWSDate values often arrive as ISO midnight — keep the calendar date, not local TZ.
  const datePrefix = isoOrDate.match(/^(\d{4}-\d{2}-\d{2})/);
  return datePrefix?.[1] ?? '';
}
