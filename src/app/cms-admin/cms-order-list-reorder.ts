/**
 * PrimeNG OrderList reorders the bound array in place, then emits `onReorder` with
 * `selection` (arrow buttons) or a single dragged item — not the full ordered list.
 * Read the mutated bound array after the event fires.
 */
export function resolveOrderListAfterReorder(
  event: unknown,
  boundList: readonly Record<string, unknown>[],
): Record<string, unknown>[] {
  if (boundList.length > 0) {
    return [...boundList];
  }

  const fromValue = extractRecordArray((event as { value?: unknown } | null)?.value);
  if (fromValue.length > 0) {
    return fromValue;
  }

  // PrimeNG emits `selection` (partial) for arrow-button moves — not the full list.
  return [];
}

function extractRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Record<string, unknown> => item != null && typeof item === 'object',
  );
}
