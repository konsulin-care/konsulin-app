import type {
  Bundle,
  FhirResource,
  PlanDefinition,
  QuestionnaireResponse,
  ResearchStudy
} from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import {
  parseQuestionnaireResponseSearchset,
  parseStudiesBundle,
  recomputeStudyProgress
} from '../research-bundle';

const TODAY = '2026-08-15';

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

function makeQrResponse(
  id: string,
  questionnaireId: string,
  authored: string
): QuestionnaireResponse {
  return {
    resourceType: 'QuestionnaireResponse',
    id,
    questionnaire: `Questionnaire/${questionnaireId}`,
    status: 'completed',
    authored
  };
}

/** Wraps resources in a batch-response entry with a nested searchset. */
function batchSearchsetEntry(
  resources: FhirResource[]
): NonNullable<Bundle['entry']>[number] {
  return {
    resource: {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: resources.map(resource => ({ resource }))
    },
    response: { status: '200' }
  };
}

describe('parseStudiesBundle', () => {
  it('parses studies and their PlanDefinition batches from a batch-response bundle', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'batch-response',
      entry: [
        batchSearchsetEntry([
          makeStudy('study-a', ['PlanDefinition/batch-1']),
          makePlan('batch-1')
        ])
      ]
    };

    const { studyProgress, consentedStudyIds } = parseStudiesBundle(
      bundle,
      TODAY
    );
    expect(studyProgress).toHaveLength(1);
    expect(studyProgress[0].study.id).toBe('study-a');
    expect(studyProgress[0].currentBatch?.id).toBe('batch-1');
    expect(studyProgress[0].batches[0].questionnaireIds).toEqual([
      'phq2',
      'big-five-inventory'
    ]);
    expect(studyProgress[0].totalCount).toBe(2);
    expect(consentedStudyIds).toEqual([]);
  });

  it('extracts consented study ids from on-study ResearchSubject entries only', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'batch-response',
      entry: [
        batchSearchsetEntry([
          {
            resourceType: 'ResearchSubject',
            id: 'rs-1',
            status: 'on-study',
            study: { reference: 'ResearchStudy/study-a' },
            individual: { reference: 'Patient/pat-1' }
          },
          {
            resourceType: 'ResearchSubject',
            id: 'rs-2',
            status: 'off-study',
            study: { reference: 'ResearchStudy/study-b' },
            individual: { reference: 'Patient/pat-1' }
          }
        ])
      ]
    };

    const { studyProgress, consentedStudyIds } = parseStudiesBundle(
      bundle,
      TODAY
    );
    expect(studyProgress).toEqual([]);
    expect(consentedStudyIds).toEqual(['study-a']);
  });

  it('handles an empty bundle with no studies', () => {
    const { studyProgress, consentedStudyIds } = parseStudiesBundle(
      { resourceType: 'Bundle', type: 'batch-response', entry: [] },
      TODAY
    );
    expect(studyProgress).toEqual([]);
    expect(consentedStudyIds).toEqual([]);
  });
});

describe('recomputeStudyProgress', () => {
  it('refills response-derived fields once responses are known', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'batch-response',
      entry: [
        batchSearchsetEntry([
          makeStudy('study-a', ['PlanDefinition/batch-1']),
          makePlan('batch-1')
        ])
      ]
    };

    const { studyProgress } = parseStudiesBundle(bundle, TODAY);
    expect(studyProgress[0].completedCount).toBe(0);

    const responses = [
      {
        id: 'r1',
        questionnaire: 'Questionnaire/phq2',
        authored: '2026-08-10T00:00:00Z'
      }
    ];
    const recomputed = recomputeStudyProgress(studyProgress, responses, TODAY);
    expect(recomputed[0].completedCount).toBe(1);
    expect(recomputed[0].history[0].participated).toBe(true);
    expect(recomputed[0].firstUncompletedQuestionnaireId).toBe(
      'big-five-inventory'
    );
  });

  it('keeps counts at zero for responses outside the batch period', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'batch-response',
      entry: [
        batchSearchsetEntry([
          makeStudy('study-a', ['PlanDefinition/batch-1']),
          makePlan('batch-1')
        ])
      ]
    };

    const { studyProgress } = parseStudiesBundle(bundle, TODAY);
    const recomputed = recomputeStudyProgress(
      studyProgress,
      [
        {
          id: 'r1',
          questionnaire: 'Questionnaire/phq2',
          authored: '2026-07-10T00:00:00Z'
        }
      ],
      TODAY
    );
    expect(recomputed[0].completedCount).toBe(0);
    expect(recomputed[0].history[0].participated).toBe(false);
  });
});

describe('parseQuestionnaireResponseSearchset', () => {
  it('projects completed QuestionnaireResponses from a plain searchset', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: 2,
      entry: [
        { resource: makeQrResponse('r1', 'phq2', '2026-08-10T00:00:00Z') },
        { resource: makeQrResponse('r2', 'gad7', '2026-08-11T00:00:00Z') }
      ]
    };

    expect(parseQuestionnaireResponseSearchset(bundle)).toEqual([
      {
        id: 'r1',
        questionnaire: 'Questionnaire/phq2',
        authored: '2026-08-10T00:00:00Z'
      },
      {
        id: 'r2',
        questionnaire: 'Questionnaire/gad7',
        authored: '2026-08-11T00:00:00Z'
      }
    ]);
  });

  it('returns an empty list for an empty searchset', () => {
    expect(
      parseQuestionnaireResponseSearchset({
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0
      })
    ).toEqual([]);
  });

  it('tolerates entries without resources', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        { resource: makeQrResponse('r1', 'phq2', '2026-08-10T00:00:00Z') },
        {}
      ]
    };

    expect(parseQuestionnaireResponseSearchset(bundle)).toHaveLength(1);
  });
});
