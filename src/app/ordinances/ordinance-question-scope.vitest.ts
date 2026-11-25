import { describe, expect, it } from 'vitest';
import { assessOrdinanceQuestion } from './ordinance-question-scope';

describe('assessOrdinanceQuestion', () => {
  it('treats blank input as empty', () => {
    expect(assessOrdinanceQuestion('   ')).toBe('empty');
  });

  it('accepts municipal-code questions in English and Spanish', () => {
    expect(assessOrdinanceQuestion('Do I need a license for my dog?')).toBe('ordinance');
    expect(assessOrdinanceQuestion('¿Necesito licencia para mi perro?')).toBe('ordinance');
    expect(assessOrdinanceQuestion('What does section 7-6-120 say?')).toBe('ordinance');
    expect(assessOrdinanceQuestion('How tall can my grass get before the Town gives me a warning?')).toBe(
      'ordinance',
    );
    expect(assessOrdinanceQuestion('Can I leave an abandoned car on the street?')).toBe('ordinance');
  });

  it('declines homework, coding, and general knowledge', () => {
    expect(assessOrdinanceQuestion('What is 12 * 8?')).toBe('out-of-scope');
    expect(assessOrdinanceQuestion('Write my essay about zoning in Wiley')).toBe('out-of-scope');
    expect(assessOrdinanceQuestion('What is the capital of France?')).toBe('out-of-scope');
  });
});
