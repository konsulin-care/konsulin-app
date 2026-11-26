import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  computeResearchProgress,
  computeStudyProgress,
  scopeProgressToJoined,
  type ResearchBatch,
  type ResearchResponse
} from '../research';

const TODAY = '2026-08-15';

function makeBatch(overrides: Partial<ResearchBatch> = {}): ResearchBatch {
  return {
    id: 'batch-1',
    start: '2026-08-01',
    end: '2026-08-31',
    questionnaireIds: ['phq2', 'big-five-inventory'],
    ...overrides
  };
}

function makeResponse(
  id: string,
  questionnaire: string,
  authored?: string
): ResearchResponse {
  return { id, questionnaire, authored };
}

function makeStudy(id: string): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id,
    status: 'active',
    title: `Study ${id}`,
    period: { start: '2026-08-01', end: '2027-07-31' }
  };
}

describe('computeStudyProgress', () => {
  it('has no consecutiveBatches field', () => {
    const progress = computeStudyProgress(
      makeStudy('a'),
      [makeBatch()],
      [makeResponse('r1', 'Questionnaire/phq2', '2026-08-10T00:00:00Z')],
      TODAY
    );
    expect(progress).not.toHaveProperty('consecutiveBatches');
    expect(progress.history[0].participated).toBe(true);
  });
});

describe('scopeProgressToJoined', () => {
  const response = makeResponse(
    'r1',
    'Questionnaire/phq2',
    '2026-08-10T00:00:00Z'
  );
  const progress = computeStudyProgress(
    makeStudy('a'),
    [makeBatch()],
    [response],
    TODAY
  );

  it('zeroes an unjoined study', () => {
    const [scoped] = scopeProgressToJoined([progress], []);
    expect(scoped.completedCount).toBe(0);
    expect(scoped.completedQuestionnaireIds).toEqual([]);
    expect(scoped.isComplete).toBe(false);
    expect(scoped.firstUncompletedQuestionnaireId).toBe('phq2');
  });

  it('keeps a joined study', () => {
    const [scoped] = scopeProgressToJoined([progress], ['a']);
    expect(scoped.completedQuestionnaireIds).toEqual(['phq2']);
    expect(scoped.completedCount).toBe(1);
  });
});

describe('computeResearchProgress', () => {
  it('returns no XP or questionnaireResponses fields', () => {
    const response = makeResponse(
      'r1',
      'Questionnaire/phq2',
      '2026-08-10T00:00:00Z'
    );
    const study = computeStudyProgress(
      makeStudy('a'),
      [makeBatch()],
      [response],
      TODAY
    );
    const progress = computeResearchProgress([study], [response]);
    expect(progress).not.toHaveProperty('questionnaireXp');
    expect(progress).not.toHaveProperty('questionnaireResponses');
    expect(progress.cumulativeResponses).toBe(1);
    expect(progress.completedQuestionnaireIds).toEqual(['phq2']);
  });

  it('returns an empty progress object when there are no responses', () => {
    const progress = computeResearchProgress([], []);
    expect(progress.cumulativeResponses).toBe(0);
    expect(progress.completedQuestionnaireIds).toEqual([]);
    expect(progress.studies).toEqual([]);
  });
});
