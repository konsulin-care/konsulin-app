import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  computeConsecutiveBatches,
  computeResearchProgress,
  computeStudyProgress,
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

function makeStudy(id: string, protocolRefs: string[]): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id,
    status: 'active',
    title: `Study ${id}`,
    period: { start: '2026-08-01', end: '2027-07-31' },
    protocol: protocolRefs.map(reference => ({ reference }))
  };
}

describe('computeConsecutiveBatches', () => {
  it('counts the run of participated batches ending at the newest participated batch', () => {
    const history = [
      { batchId: 'b1', participated: true },
      { batchId: 'b2', participated: true },
      { batchId: 'b3', participated: false }
    ] as unknown as { batchId: string; participated: boolean }[];
    expect(computeConsecutiveBatches(history)).toBe(2);
  });

  it('counts all batches when every batch was participated', () => {
    const history = [
      { batchId: 'b1', participated: true },
      { batchId: 'b2', participated: true }
    ] as unknown as { batchId: string; participated: boolean }[];
    expect(computeConsecutiveBatches(history)).toBe(2);
  });

  it('returns zero when no batch was participated', () => {
    const history = [
      { batchId: 'b1', participated: false },
      { batchId: 'b2', participated: false }
    ] as unknown as { batchId: string; participated: boolean }[];
    expect(computeConsecutiveBatches(history)).toBe(0);
  });
});

describe('computeResearchProgress', () => {
  it('counts a shared questionnaire once while ticking both studies', () => {
    const shared = makeResponse(
      'r1',
      'Questionnaire/phq2',
      '2026-08-10T00:00:00Z'
    );
    const studyA = computeStudyProgress(
      makeStudy('study-a', ['PlanDefinition/batch-1']),
      [makeBatch()],
      [shared],
      TODAY
    );
    const studyB = computeStudyProgress(
      makeStudy('study-b', ['PlanDefinition/batch-1']),
      [makeBatch()],
      [shared],
      TODAY
    );
    const progress = computeResearchProgress([studyA, studyB], [shared]);
    expect(studyA.completedCount).toBe(1);
    expect(studyB.completedCount).toBe(1);
    expect(progress.cumulativeResponses).toBe(1);
    expect(progress.currentLevel?.label).toBe('Participant');
  });

  it('maps cumulative responses to the level ladder', () => {
    const responses = Array.from({ length: 5 }, (_, i) =>
      makeResponse(`r${i}`, 'Questionnaire/phq2', `2026-08-0${i + 1}T00:00:00Z`)
    );
    const progress = computeResearchProgress([], responses);
    expect(progress.cumulativeResponses).toBe(5);
    expect(progress.currentLevel?.label).toBe('Contributor');
    expect(progress.nextLevel?.label).toBe('Advocate');
    expect(progress.completedQuestionnaireIds).toEqual(['phq2']);
  });

  it('returns an empty progress object when there are no responses', () => {
    const progress = computeResearchProgress([], []);
    expect(progress.cumulativeResponses).toBe(0);
    expect(progress.currentLevel).toBeNull();
    expect(progress.nextLevel?.label).toBe('Participant');
    expect(progress.completedQuestionnaireIds).toEqual([]);
    expect(progress.studies).toEqual([]);
  });
});
