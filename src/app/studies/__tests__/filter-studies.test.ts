import type { ResearchBatch, StudyProgress } from '@/utils/fhir/research';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { filterStudies, type StudyFilter } from '../filter-studies';

const ONE_BATCH: ResearchBatch = {
  id: 'batch-1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2']
};

const TWO_BATCHES: ResearchBatch[] = [
  ONE_BATCH,
  {
    id: 'batch-2',
    start: '2026-09-01',
    end: '2026-09-30',
    questionnaireIds: ['phq2']
  }
];

/**
 * Builds a study progress entry for filter tests.
 * @param study - ResearchStudy fields to use
 * @param batches - batches of the study
 * @returns study progress entry
 */
function makeItem(
  study: Partial<ResearchStudy>,
  batches: ResearchBatch[] = [ONE_BATCH]
): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'study',
      status: 'active',
      title: 'Default title',
      ...study
    },
    batches,
    currentBatch: batches[0] ?? null,
    completedCount: 0,
    totalCount: 1,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: [],
    history: []
  };
}

const KONSULIN = makeItem({ id: 'konsulin', title: 'Sleep and mood' });
const OTHER = makeItem({
  id: 'other',
  title: 'Work stress',
  sponsor: { reference: 'Organization/g1', display: 'Group One' },
  objective: [{ name: 'Does walking help?' }]
});
const REPEATED = makeItem(
  {
    id: 'repeated',
    title: 'Yearly cohort',
    sponsor: { reference: 'Organization/g2', display: 'Group Two' }
  },
  TWO_BATCHES
);

const ITEMS = [KONSULIN, OTHER, REPEATED];

/**
 * Runs filterStudies with defaults overridden by the given partial filter.
 * @param filter - partial filter values
 * @returns filtered study ids
 */
function ids(filter: Partial<StudyFilter>): string[] {
  return filterStudies(ITEMS, {
    query: '',
    runBy: 'all',
    kind: 'all',
    ...filter
  }).map(item => item.study.id ?? '');
}

describe('filterStudies', () => {
  it('matches title, research question or group ignoring case', () => {
    expect(ids({ query: 'SLEEP' })).toEqual(['konsulin']);
    expect(ids({ query: 'walking' })).toEqual(['other']);
    expect(ids({ query: 'group TWO' })).toEqual(['repeated']);
    expect(ids({ query: 'nothing here' })).toEqual([]);
    expect(ids({ query: '   ' })).toEqual(['konsulin', 'other', 'repeated']);
  });

  it('separates Konsulin from other groups', () => {
    expect(ids({ runBy: 'konsulin' })).toEqual(['konsulin']);
    expect(ids({ runBy: 'other' })).toEqual(['other', 'repeated']);
    expect(ids({ runBy: 'all' })).toEqual(['konsulin', 'other', 'repeated']);
  });

  it('separates one-time from repeated studies', () => {
    expect(ids({ kind: 'one-time' })).toEqual(['konsulin', 'other']);
    expect(ids({ kind: 'repeated' })).toEqual(['repeated']);
    expect(ids({ kind: 'all' })).toEqual(['konsulin', 'other', 'repeated']);
  });

  it('combines query, run-by and kind filters', () => {
    expect(ids({ query: 'cohort', kind: 'one-time' })).toEqual([]);
    expect(ids({ query: 'cohort', kind: 'repeated' })).toEqual(['repeated']);
    expect(ids({ runBy: 'konsulin', kind: 'repeated' })).toEqual([]);
  });

  it('honours a configured Konsulin organization id', () => {
    expect(ids({ runBy: 'konsulin', konsulinOrganizationId: 'g2' })).toEqual([
      'konsulin',
      'repeated'
    ]);
  });
});
