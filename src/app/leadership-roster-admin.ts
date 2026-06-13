export const LEADERSHIP_INSERT_TOP = '__top__';
export const LEADERSHIP_INSERT_BOTTOM = '__bottom__';

export function buildLeadershipInsertOptions(
  records: Record<string, unknown>[],
  previewField = 'lineEn',
): { label: string; value: string }[] {
  const options: { label: string; value: string }[] = [
    { label: 'At the top of the list', value: LEADERSHIP_INSERT_TOP },
  ];

  for (const record of records) {
    const id = String(record['id'] ?? '');
    const line = String(record[previewField] ?? '').trim();
    if (id && line) {
      options.push({ label: `After “${line}”`, value: `after:${id}` });
    }
  }

  options.push({ label: 'At the bottom of the list', value: LEADERSHIP_INSERT_BOTTOM });
  return options;
}

export function resolveLeadershipInsertIndex(
  insertPosition: string,
  existingRecords: Record<string, unknown>[],
): number {
  if (insertPosition === LEADERSHIP_INSERT_TOP) {
    return 0;
  }

  if (insertPosition === LEADERSHIP_INSERT_BOTTOM) {
    return existingRecords.length;
  }

  if (insertPosition.startsWith('after:')) {
    const id = insertPosition.slice('after:'.length);
    const index = existingRecords.findIndex((record) => String(record['id'] ?? '') === id);
    return index >= 0 ? index + 1 : existingRecords.length;
  }

  return existingRecords.length;
}

export function prepareLeadershipRosterMutationInput(
  input: Record<string, unknown>,
  editingId?: string | null,
): Record<string, unknown> {
  const next = { ...input };

  if (!editingId && typeof next['lineEn'] === 'string' && !String(next['lineEs'] ?? '').trim()) {
    next['lineEs'] = next['lineEn'];
  }

  return next;
}
