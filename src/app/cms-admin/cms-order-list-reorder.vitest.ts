import { describe, expect, it } from 'vitest';
import { resolveOrderListAfterReorder } from './cms-order-list-reorder';

describe('resolveOrderListAfterReorder', () => {
  const records = [
    { id: 'a', displayOrder: 0 },
    { id: 'b', displayOrder: 1 },
    { id: 'c', displayOrder: 2 },
  ];

  it('prefers the bound list PrimeNG already mutated in place', () => {
    const reordered = [
      { id: 'b', displayOrder: 1 },
      { id: 'a', displayOrder: 0 },
      { id: 'c', displayOrder: 2 },
    ];
    expect(resolveOrderListAfterReorder([{ id: 'b' }], reordered)).toEqual(reordered);
  });

  it('falls back to event.value when the bound list is empty', () => {
    expect(resolveOrderListAfterReorder({ value: records }, [])).toEqual(records);
  });

  it('ignores PrimeNG selection payloads when the bound list is empty', () => {
    expect(resolveOrderListAfterReorder([{ id: 'a' }], [])).toEqual([]);
  });
});
