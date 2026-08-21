import { describe, expect, it } from 'vitest';
import { enrichAdminRosterLine, parseRosterLine } from './contact-page';

describe('parseRosterLine', () => {
  it('splits role and name on the first colon', () => {
    expect(parseRosterLine('Mayor: Steve McKitrick')).toEqual({
      role: 'Mayor',
      name: 'Steve McKitrick',
    });
  });

  it('splits role and name on hyphen separators used in live CMS rows', () => {
    expect(parseRosterLine('Deputy City Clerk - Paige Lindo')).toEqual({
      role: 'Deputy City Clerk',
      name: 'Paige Lindo',
    });
  });
});

describe('enrichAdminRosterLine', () => {
  it('attaches mailto without copying OfficialContact detail onto the roster row', () => {
    const enriched = enrichAdminRosterLine(
      { id: 'roster-1', line: 'City Clerk: Deb Dillon' },
      [
        {
          id: 'city-clerk',
          label: 'City Clerk',
          value: 'Deb Dillon',
          detail: 'Clerk services and records coordination.',
          href: 'mailto:clerk@townofwiley.gov',
          linkLabel: 'clerk@townofwiley.gov',
        },
      ],
    );
    expect(enriched.href).toBe('mailto:clerk@townofwiley.gov');
    expect(enriched.linkLabel).toBe('clerk@townofwiley.gov');
    expect(enriched).not.toHaveProperty('detail');
  });
});
