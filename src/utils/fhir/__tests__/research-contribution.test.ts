import { describe, expect, it } from 'vitest';
import type { ResearchBatch, StudyProgress } from '../research';
import { computeGivenTotals } from '../research-contribution';

function makeStudy(id: string, batches: ResearchBatch[]): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id,
      status: 'active',
      title: id
    },
    batches,
    currentBatch: batches[0] ?? null,
    completedCount: 0,
    totalCount: 0,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: [],
    history: []
  };
}

const batch = (id: string, q: string[]): ResearchBatch => ({
  id,
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: q
});

const resp = (id: string, q: string) => ({
  id,
  questionnaire: `Questionnaire/${q}`,
  authored: '2026-08-10T10:00:00Z'
});

describe('computeGivenTotals', () => {
  const a = makeStudy('a', [batch('a1', ['phq2', 'ocean'])]);
  const b = makeStudy('b', [batch('b1', ['phq2'])]);
  const c = makeStudy('c', [batch('c1', ['ocean'])]);

  it('counts each completed response once across joined studies', () => {
    const totals = computeGivenTotals({
      studies: [a, b],
      joinedIds: ['a', 'b'],
      responses: [resp('r1', 'phq2')],
      durations: new Map([['phq2', 5]])
    });
    expect(totals.questionnairesShared).toBe(1);
    expect(totals.minutes).toBe(5);
  });

  it('sums only known durations', () => {
    const totals = computeGivenTotals({
      studies: [a],
      joinedIds: ['a'],
      responses: [resp('r1', 'phq2'), resp('r2', 'ocean')],
      durations: new Map<string, number | null>([
        ['phq2', 8],
        ['ocean', null]
      ])
    });
    expect(totals.minutes).toBe(8);
    expect(totals.questionnairesShared).toBe(2);
  });

  it('counts joined studies with responses and ignores unjoined', () => {
    const totals = computeGivenTotals({
      studies: [a, b, c],
      joinedIds: ['a', 'c'],
      responses: [resp('r1', 'phq2')],
      durations: new Map()
    });
    expect(totals.studies).toBe(1);
  });
});
