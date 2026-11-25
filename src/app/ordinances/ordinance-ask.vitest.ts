import { describe, expect, it } from 'vitest';
import { formatOrdinanceCitation, planOrdinanceReply } from './ordinance-ask';

describe('planOrdinanceReply', () => {
  it('keeps an in-scope question on the page when the endpoint is empty', () => {
    expect(planOrdinanceReply('ordinance', '')).toBe('pending');
    expect(planOrdinanceReply('ordinance', '   ')).toBe('pending');
  });

  it('calls the API only for an in-scope question with an endpoint', () => {
    expect(planOrdinanceReply('ordinance', 'https://example.test/ask')).toBe('ask');
  });

  it('declines an off-topic question without using the endpoint', () => {
    expect(planOrdinanceReply('out-of-scope', 'https://example.test/ask')).toBe('decline');
  });
});

describe('formatOrdinanceCitation', () => {
  it('names the later dog ordinance separately from the code', () => {
    expect(formatOrdinanceCitation({ section: '7-6-120', authority: 'ordinance-2024-2' })).toBe(
      'Ordinance 2024-2, Section 7-6-120',
    );
    expect(formatOrdinanceCitation({ section: '16-2-20', authority: 'code' })).toBe(
      'Wiley Municipal Code, Section 16-2-20',
    );
    expect(formatOrdinanceCitation({ section: '1', authority: 'ordinance-2024-1' })).toBe(
      'Ordinance 2024-1, Section 1',
    );
    expect(formatOrdinanceCitation({ section: '2026-1', authority: 'resolution-2026-1-election' })).toBe(
      'Resolution 2026-1 (election)',
    );
    expect(formatOrdinanceCitation({ section: '20-B', authority: 'code-index' })).toBe(
      'Wiley Municipal Code index, 20-B',
    );
    expect(
      formatOrdinanceCitation({
        section: 'Resolution 2025 supplemental budget',
        authority: 'resolution-2025-supplemental-budget',
      }),
    ).toBe('Resolution 2025 supplemental budget');
  });
});
