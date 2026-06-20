import { LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL } from './leadership-roster-group-ids';

/** True when lineEn/lineEs looks like the Mayor (not Mayor Pro Tem alone on a trustee line). */
export function leadershipLineLooksLikeMayor(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('mayor:') || lower.startsWith('alcalde:')) {
    return true;
  }

  const colonIndex = trimmed.indexOf(':');
  if (colonIndex > 0) {
    const role = trimmed.slice(0, colonIndex).trim().toLowerCase();
    if (role === 'mayor' || role === 'alcalde') {
      return true;
    }
  }

  return /^mayor\s[-–—]/i.test(trimmed) || /^alcalde\s[-–—]/i.test(trimmed);
}

/**
 * When elected-officials CMS rows exist but none look like Mayor, the public site shows
 * trustees only — bundled Mayor text is fully replaced.
 */
export function electedRosterMissingMayorLine(
  records: readonly Record<string, unknown>[],
  groupField = 'groupId',
  previewField = 'lineEn',
): boolean {
  const mayorCouncil = records.filter(
    (record) =>
      record['active'] !== false &&
      String(record[groupField] ?? '').trim() === LEADERSHIP_ROSTER_GROUP_MAYOR_COUNCIL,
  );

  if (mayorCouncil.length === 0) {
    return false;
  }

  return !mayorCouncil.some((record) => {
    const lineEn = String(record[previewField] ?? '');
    const lineEs = String(record['lineEs'] ?? '');
    return leadershipLineLooksLikeMayor(lineEn) || leadershipLineLooksLikeMayor(lineEs);
  });
}
