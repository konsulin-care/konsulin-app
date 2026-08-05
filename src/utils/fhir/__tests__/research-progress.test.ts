import { DEFAULT_QUESTIONNAIRE_XP } from '@/constants/research';
import type { ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  computeConsecutiveBatches,
  computeQuestionnaireXp,
  computeResearchProgress,
  computeStudyProgress,
  type BatchHistoryEntry,
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
    ] as unknown as BatchHistoryEntry[];
    expect(computeConsecutiveBatches(history)).toBe(2);
  });

  it('counts all batches when every batch was participated', () => {
    const history = [
      { batchId: 'b1', participated: true },
      { batchId: 'b2', participated: true }
    ] as unknown as BatchHistoryEntry[];
    expect(computeConsecutiveBatches(history)).toBe(2);
  });

  it('returns zero when no batch was participated', () => {
    const history = [
      { batchId: 'b1', participated: false },
      { batchId: 'b2', participated: false }
    ] as unknown as BatchHistoryEntry[];
    expect(computeConsecutiveBatches(history)).toBe(0);
  });
});

describe('computeQuestionnaireXp', () => {
  it('sums durations for known questionnaires and falls back to 5 XP otherwise', () => {
    expect(computeQuestionnaireXp(['phq2', 'gad7'], { phq2: 8 })).toBe(13);
    expect(computeQuestionnaireXp(['phq2'], { phq2: 8 })).toBe(8);
  });

  it('returns zero for no responses', () => {
    expect(computeQuestionnaireXp([], {})).toBe(0);
  });

  it('treats a null duration as unknown and applies the default', () => {
    expect(computeQuestionnaireXp(['phq2'], { phq2: null })).toBe(
      DEFAULT_QUESTIONNAIRE_XP
    );
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
    const progress = computeResearchProgress([studyA, studyB], [shared], [], {
      phq2: 8
    });
    expect(studyA.completedCount).toBe(1);
    expect(studyB.completedCount).toBe(1);
    expect(progress.cumulativeResponses).toBe(1);
    expect(progress.questionnaireXp).toBe(8);
  });

  it('sums per-response durations into questionnaire XP', () => {
    const responses = [
      makeResponse('r1', 'Questionnaire/phq2', '2026-08-01T00:00:00Z'),
      makeResponse(
        'r2',
        'Questionnaire/big-five-inventory',
        '2026-08-02T00:00:00Z'
      )
    ];
    const progress = computeResearchProgress([], responses, [], {
      phq2: 8,
      'big-five-inventory': 15
    });
    expect(progress.questionnaireXp).toBe(23);
    expect(progress.questionnaireResponses).toEqual([
      'phq2',
      'big-five-inventory'
    ]);
    expect(progress.completedQuestionnaireIds).toEqual([
      'phq2',
      'big-five-inventory'
    ]);
  });

  it('applies the default XP for questionnaires without a known duration', () => {
    const progress = computeResearchProgress(
      [],
      [makeResponse('r1', 'Questionnaire/gad7', '2026-08-01T00:00:00Z')]
    );
    expect(progress.questionnaireXp).toBe(DEFAULT_QUESTIONNAIRE_XP);
  });

  it('keeps per-response questionnaire ids for double completions', () => {
    const responses = [
      makeResponse('r1', 'Questionnaire/phq2', '2026-08-01T00:00:00Z'),
      makeResponse('r2', 'Questionnaire/phq2', '2026-08-02T00:00:00Z')
    ];
    const progress = computeResearchProgress([], responses, [], { phq2: 8 });
    expect(progress.questionnaireResponses).toEqual(['phq2', 'phq2']);
    expect(progress.questionnaireXp).toBe(16);
    expect(progress.completedQuestionnaireIds).toEqual(['phq2']);
  });

  it('returns an empty progress object when there are no responses', () => {
    const progress = computeResearchProgress([], []);
    expect(progress.cumulativeResponses).toBe(0);
    expect(progress.questionnaireXp).toBe(0);
    expect(progress.questionnaireResponses).toEqual([]);
    expect(progress.completedQuestionnaireIds).toEqual([]);
    expect(progress.studies).toEqual([]);
  });
});
