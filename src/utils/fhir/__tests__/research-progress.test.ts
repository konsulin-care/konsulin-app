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
  type ResearchResponse,
  type StudyProgress
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

/** Builds a StudyProgress for a study owning the given batches. */
function makeStudyProgress(
  batches: ResearchBatch[],
  studyId = 'study-a'
): StudyProgress {
  return computeStudyProgress(
    makeStudy(
      studyId,
      batches.map(batch => `PlanDefinition/${batch.id}`)
    ),
    batches,
    [],
    TODAY
  );
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
  it('awards 5 XP per minute and falls back to 5 XP for unknown durations', () => {
    expect(
      computeQuestionnaireXp(['phq2', 'gad7'], new Map([['phq2', 8]]))
    ).toBe(45);
    expect(computeQuestionnaireXp(['phq2'], new Map([['phq2', 8]]))).toBe(40);
  });

  it('returns zero for no responses', () => {
    expect(computeQuestionnaireXp([], new Map())).toBe(0);
  });

  it('treats a null duration as unknown and applies the default', () => {
    expect(computeQuestionnaireXp(['phq2'], new Map([['phq2', null]]))).toBe(
      DEFAULT_QUESTIONNAIRE_XP
    );
  });
});

describe('computeResearchProgress', () => {
  it('awards XP per study that deploys a shared questionnaire', () => {
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
    const progress = computeResearchProgress(
      [studyA, studyB],
      [shared],
      [],
      new Map([['phq2', 8]])
    );
    expect(studyA.completedCount).toBe(1);
    expect(studyB.completedCount).toBe(1);
    expect(progress.cumulativeResponses).toBe(1);
    expect(progress.questionnaireResponses).toEqual(['phq2', 'phq2']);
    expect(progress.questionnaireXp).toBe(80);
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
    const progress = computeResearchProgress(
      [makeStudyProgress([makeBatch()])],
      responses,
      [],
      new Map([
        ['phq2', 8],
        ['big-five-inventory', 15]
      ])
    );
    expect(progress.questionnaireXp).toBe(115);
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
      [makeStudyProgress([makeBatch()])],
      [
        makeResponse(
          'r1',
          'Questionnaire/big-five-inventory',
          '2026-08-01T00:00:00Z'
        )
      ]
    );
    expect(progress.questionnaireXp).toBe(DEFAULT_QUESTIONNAIRE_XP);
  });

  it('counts a questionnaire once per batch period despite duplicate submissions', () => {
    const responses = [
      makeResponse('r1', 'Questionnaire/phq2', '2026-08-01T00:00:00Z'),
      makeResponse('r2', 'Questionnaire/phq2', '2026-08-02T00:00:00Z')
    ];
    const progress = computeResearchProgress(
      [makeStudyProgress([makeBatch()])],
      responses,
      [],
      new Map([['phq2', 8]])
    );
    expect(progress.questionnaireResponses).toEqual(['phq2']);
    expect(progress.questionnaireXp).toBe(40);
    expect(progress.completedQuestionnaireIds).toEqual(['phq2']);
  });

  it('counts the same questionnaire again in a different batch period', () => {
    const responses = [
      makeResponse('r1', 'Questionnaire/phq2', '2026-08-10T00:00:00Z'),
      makeResponse('r2', 'Questionnaire/phq2', '2026-09-10T00:00:00Z')
    ];
    const progress = computeResearchProgress(
      [
        makeStudyProgress([
          makeBatch(),
          makeBatch({
            id: 'batch-2',
            start: '2026-09-01',
            end: '2026-09-30'
          })
        ])
      ],
      responses,
      [],
      new Map([['phq2', 8]])
    );
    expect(progress.questionnaireResponses).toEqual(['phq2', 'phq2']);
    expect(progress.questionnaireXp).toBe(80);
  });

  it('counts a shared questionnaire once per study despite identical batch periods', () => {
    const shared = makeResponse(
      'r1',
      'Questionnaire/phq2',
      '2026-08-10T00:00:00Z'
    );
    const progress = computeResearchProgress(
      [
        makeStudyProgress([makeBatch()], 'study-a'),
        makeStudyProgress([makeBatch()], 'study-b')
      ],
      [shared],
      [],
      new Map([['phq2', 4]])
    );
    // 4 minutes → 20 XP per study; two deploying studies → 40 XP total.
    expect(progress.questionnaireResponses).toEqual(['phq2', 'phq2']);
    expect(progress.questionnaireXp).toBe(40);
  });

  it.each([
    { start: '2026-08-05', end: '2026-08-20', ids: ['phq2', 'phq2'], xp: 80 },
    { start: '2026-09-01', end: '2026-09-30', ids: ['phq2'], xp: 40 }
  ])(
    'awards XP per study whose window covers the response ($start)',
    ({ start, end, ids, xp }) => {
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
        makeStudy('study-b', ['PlanDefinition/batch-2']),
        [makeBatch({ id: 'batch-2', start, end })],
        [shared],
        TODAY
      );
      const progress = computeResearchProgress(
        [studyA, studyB],
        [shared],
        [],
        new Map([['phq2', 8]])
      );
      expect(progress.questionnaireResponses).toEqual(ids);
      expect(progress.questionnaireXp).toBe(xp);
    }
  );

  it('ignores responses authored outside all batch periods', () => {
    const progress = computeResearchProgress(
      [makeStudyProgress([makeBatch()])],
      [makeResponse('r1', 'Questionnaire/phq2', '2026-05-15T00:00:00Z')],
      [],
      new Map([['phq2', 8]])
    );
    expect(progress.questionnaireResponses).toEqual([]);
    expect(progress.questionnaireXp).toBe(0);
  });

  it('awards no XP for responses to questionnaires outside every batch', () => {
    const progress = computeResearchProgress(
      [makeStudyProgress([makeBatch()])],
      [makeResponse('r1', 'Questionnaire/gad7', '2026-08-10T00:00:00Z')],
      [],
      new Map([['gad7', 3]])
    );
    expect(progress.questionnaireResponses).toEqual([]);
    expect(progress.questionnaireXp).toBe(0);
  });

  it('counts responses on the inclusive batch period boundaries', () => {
    const responses = [
      makeResponse('r1', 'Questionnaire/phq2', '2026-08-01T00:00:00Z'),
      makeResponse(
        'r2',
        'Questionnaire/big-five-inventory',
        '2026-08-31T23:59:59Z'
      )
    ];
    const progress = computeResearchProgress(
      [makeStudyProgress([makeBatch()])],
      responses,
      [],
      new Map([
        ['phq2', 8],
        ['big-five-inventory', 3]
      ])
    );
    expect(progress.questionnaireXp).toBe(55);
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
