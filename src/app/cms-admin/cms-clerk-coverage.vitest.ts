import { describe, expect, it } from 'vitest';
import { clerkPlainOperationLabel, clerkTaskTitleForModel } from './cms-clerk-coverage';

describe('cms-clerk-coverage', () => {
  it('maps models to clerk-friendly task titles', () => {
    expect(clerkTaskTitleForModel('PublicDocument')).toMatch(/Upload meeting/i);
    expect(clerkTaskTitleForModel('SiteCopy')).toMatch(/menu labels/i);
  });

  it('maps stream operations to plain English', () => {
    expect(clerkPlainOperationLabel('INSERT')).toBe('Added');
    expect(clerkPlainOperationLabel('MODIFY')).toBe('Updated');
    expect(clerkPlainOperationLabel('REMOVE')).toBe('Removed');
  });
});
