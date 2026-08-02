import type { PlanDefinition, ResearchStudy } from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  computeStudyProgress,
  extractQuestionnaireId,
  isDateInRange,
  isResponseInBatch,
  mergeResponses,
  parseCanonicalOrReference,
  sortBatches,
  toResearchBatch,
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

function makePlan(
  id: string,
  start = '2026-08-01',
  end = '2026-08-31'
): PlanDefinition {
  return {
    resourceType: 'PlanDefinition',
    id,
    status: 'active',
    effectivePeriod: { start, end },
    action: [
      { definitionCanonical: 'Questionnaire/phq2' },
      { definitionCanonical: 'Questionnaire/big-five-inventory' }
    ]
  };
}

describe('extractQuestionnaireId', () => {
  it('extracts the id from reference and canonical forms, stripping versions', () => {
    expect(extractQuestionnaireId('Questionnaire/phq2')).toBe('phq2');
    expect(extractQuestionnaireId('Questionnaire/big-five-inventory')).toBe(
      'big-five-inventory'
    );
    expect(
      extractQuestionnaireId('https://example.org/fhir/Questionnaire/phq2|1.0')
    ).toBe('phq2');
  });

  it('returns null for empty input', () => {
    const emptyCanonical: string | undefined = undefined;
    expect(extractQuestionnaireId(emptyCanonical)).toBeNull();
    expect(extractQuestionnaireId('')).toBeNull();
  });
});

describe('parseCanonicalOrReference', () => {
  it('parses PlanDefinition references in reference, canonical, and bare forms', () => {
    expect(
      parseCanonicalOrReference('PlanDefinition/research', 'PlanDefinition')
    ).toBe('research');
    expect(
      parseCanonicalOrReference(
        'https://example.org/PlanDefinition/research',
        'PlanDefinition'
      )
    ).toBe('research');
    expect(parseCanonicalOrReference('research', 'PlanDefinition')).toBe(
      'research'
    );
    const emptyValue: string | undefined = undefined;
    expect(parseCanonicalOrReference(emptyValue, 'PlanDefinition')).toBeNull();
  });
});

describe('toResearchBatch', () => {
  it('maps a PlanDefinition to a batch with period and questionnaires', () => {
    expect(toResearchBatch(makePlan('batch-1'))).toEqual({
      id: 'batch-1',
      start: '2026-08-01',
      end: '2026-08-31',
      questionnaireIds: ['phq2', 'big-five-inventory']
    });
  });

  it('returns null when the plan has no effectivePeriod', () => {
    const plan: PlanDefinition = {
      resourceType: 'PlanDefinition',
      id: 'x',
      status: 'active'
    };
    expect(toResearchBatch(plan)).toBeNull();
  });
});

describe('isDateInRange', () => {
  it('includes dates inside the inclusive [start, end] window', () => {
    expect(isDateInRange('2026-08-15', '2026-08-01', '2026-08-31')).toBe(true);
    expect(isDateInRange('2026-08-01', '2026-08-01', '2026-08-31')).toBe(true);
    expect(isDateInRange('2026-08-31', '2026-08-01', '2026-08-31')).toBe(true);
  });

  it('excludes dates outside the window and missing bounds', () => {
    expect(isDateInRange('2026-07-31', '2026-08-01', '2026-08-31')).toBe(false);
    expect(isDateInRange('2026-09-01', '2026-08-01', '2026-08-31')).toBe(false);
    const missingStart: string | undefined = undefined;
    expect(isDateInRange('2026-08-15', missingStart, '2026-08-31')).toBe(false);
  });
});

describe('isResponseInBatch', () => {
  const batch = makeBatch();

  it('matches a response whose questionnaire is in the batch and authored within the period', () => {
    expect(
      isResponseInBatch(
        makeResponse('r1', 'Questionnaire/phq2', '2026-08-10T10:00:00Z'),
        batch
      )
    ).toBe(true);
  });

  it('rejects responses outside the batch period, from other questionnaires, or without authored', () => {
    expect(
      isResponseInBatch(
        makeResponse('r1', 'Questionnaire/phq2', '2026-07-10T10:00:00Z'),
        batch
      )
    ).toBe(false);
    expect(
      isResponseInBatch(
        makeResponse('r1', 'Questionnaire/gad7', '2026-08-10T10:00:00Z'),
        batch
      )
    ).toBe(false);
    expect(
      isResponseInBatch(makeResponse('r1', 'Questionnaire/phq2'), batch)
    ).toBe(false);
  });
});

describe('mergeResponses', () => {
  it('dedupes responses by id, keeping the first occurrence', () => {
    const merged = mergeResponses([
      makeResponse('a', 'Questionnaire/phq2', '2026-08-01T00:00:00Z'),
      makeResponse('a', 'Questionnaire/phq2', '2026-08-01T00:00:00Z'),
      makeResponse(
        'b',
        'Questionnaire/big-five-inventory',
        '2026-08-02T00:00:00Z'
      )
    ]);
    expect(merged.map(r => r.id)).toEqual(['a', 'b']);
  });
});

describe('sortBatches', () => {
  it('sorts batches by period start ascending', () => {
    const sorted = sortBatches([
      makeBatch({ id: 'b2', start: '2026-09-01', end: '2026-09-30' }),
      makeBatch({ id: 'b1', start: '2026-08-01', end: '2026-08-31' })
    ]);
    expect(sorted.map(b => b.id)).toEqual(['b1', 'b2']);
  });
});

describe('computeStudyProgress', () => {
  const batch = makeBatch({
    id: 'batch-1',
    questionnaireIds: ['phq2', 'big-five-inventory']
  });

  it('selects the current batch by effectivePeriod and counts unique completed questionnaires', () => {
    const progress = computeStudyProgress(
      makeStudy('study-a', ['PlanDefinition/batch-1']),
      [batch],
      [makeResponse('r1', 'Questionnaire/phq2', '2026-08-10T00:00:00Z')],
      TODAY
    );
    expect(progress.currentBatch?.id).toBe('batch-1');
    expect(progress.completedCount).toBe(1);
    expect(progress.totalCount).toBe(2);
    expect(progress.isComplete).toBe(false);
    expect(progress.completedQuestionnaireIds).toEqual(['phq2']);
    expect(progress.firstUncompletedQuestionnaireId).toBe('big-five-inventory');
  });

  it('marks a batch complete when all questionnaires are answered once', () => {
    const progress = computeStudyProgress(
      makeStudy('study-a', ['PlanDefinition/batch-1']),
      [batch],
      [
        makeResponse('r1', 'Questionnaire/phq2', '2026-08-10T00:00:00Z'),
        makeResponse(
          'r2',
          'Questionnaire/big-five-inventory',
          '2026-08-11T00:00:00Z'
        )
      ],
      TODAY
    );
    expect(progress.isComplete).toBe(true);
    expect(progress.completedCount).toBe(2);
    expect(progress.firstUncompletedQuestionnaireId).toBeNull();
  });

  it('does not count responses authored outside the current batch period', () => {
    const progress = computeStudyProgress(
      makeStudy('study-a', ['PlanDefinition/batch-1']),
      [batch],
      [makeResponse('r-old', 'Questionnaire/phq2', '2026-07-01T00:00:00Z')],
      TODAY
    );
    expect(progress.completedCount).toBe(0);
    expect(progress.firstUncompletedQuestionnaireId).toBe('phq2');
  });

  it('returns zeroed progress when no batch contains today', () => {
    const future = makeBatch({
      id: 'b9',
      start: '2026-09-01',
      end: '2026-09-30'
    });
    const progress = computeStudyProgress(
      makeStudy('study-a', ['PlanDefinition/b9']),
      [future],
      [],
      TODAY
    );
    expect(progress.currentBatch).toBeNull();
    expect(progress.completedCount).toBe(0);
    expect(progress.totalCount).toBe(0);
    expect(progress.isComplete).toBe(false);
    expect(progress.firstUncompletedQuestionnaireId).toBeNull();
  });

  it('builds a batch history with participation flags per batch', () => {
    const b1 = makeBatch({
      id: 'b1',
      start: '2026-07-01',
      end: '2026-07-31',
      questionnaireIds: ['phq2']
    });
    const b2 = makeBatch({
      id: 'b2',
      start: '2026-08-01',
      end: '2026-08-31',
      questionnaireIds: ['phq2']
    });
    const progress = computeStudyProgress(
      makeStudy('study-a', ['PlanDefinition/b1', 'PlanDefinition/b2']),
      [b1, b2],
      [makeResponse('r1', 'Questionnaire/phq2', '2026-07-05T00:00:00Z')],
      TODAY
    );
    expect(progress.history.map(h => [h.batchId, h.participated])).toEqual([
      ['b1', true],
      ['b2', false]
    ]);
  });
});
