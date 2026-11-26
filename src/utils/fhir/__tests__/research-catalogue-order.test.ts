import type { StudyProgress } from '@/utils/fhir/research';
import { sortCatalogue } from '@/utils/fhir/research-catalogue-order';
import { describe, expect, it } from 'vitest';

function make(title: string, end?: string, org?: string): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      status: 'active',
      title,
      ...(org ? { sponsor: { reference: `Organization/${org}` } } : {})
    },
    currentBatch: end
      ? { id: title, start: '2025-01-01', end, questionnaireIds: [] }
      : null
  } as unknown as StudyProgress;
}

const titles = (list: StudyProgress[]): (string | undefined)[] =>
  list.map(s => s.study.title);

describe('sortCatalogue', () => {
  it('puts Konsulin studies before other groups', () => {
    const out = sortCatalogue([make('A', '2025-01-01', 'x'), make('B')], 'k');
    expect(titles(out)).toEqual(['B', 'A']);
  });

  it('sorts by batch end with no open batch last', () => {
    const out = sortCatalogue(
      [make('A'), make('B', '2025-03-01'), make('C', '2025-02-01')],
      'k'
    );
    expect(titles(out)).toEqual(['C', 'B', 'A']);
  });

  it('breaks ties by title', () => {
    const out = sortCatalogue([make('B'), make('A')], 'k');
    expect(titles(out)).toEqual(['A', 'B']);
  });
});
