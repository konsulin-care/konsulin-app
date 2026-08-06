import type {
  Bundle,
  PlanDefinition,
  QuestionnaireResponse,
  ResearchStudy
} from 'fhir/r4';
import { describe, expect, it } from 'vitest';
import { parseResearchBundle } from '../research-bundle';

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

describe('parseResearchBundle', () => {
  it('parses a batch-response bundle into typed research progress', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'batch-response',
      entry: [
        {
          resource: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [
              { resource: makeStudy('study-a', ['PlanDefinition/batch-1']) },
              { resource: makePlan('batch-1') }
            ]
          },
          response: { status: '200' }
        },
        {
          resource: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [
              {
                resource: makeQrResponse('r1', 'phq2', '2026-08-10T00:00:00Z')
              }
            ]
          },
          response: { status: '200' }
        }
      ]
    };

    const progress = parseResearchBundle(bundle, TODAY);
    expect(progress.studies).toHaveLength(1);
    expect(progress.studies[0].study.id).toBe('study-a');
    expect(progress.studies[0].currentBatch?.id).toBe('batch-1');
    expect(progress.studies[0].completedCount).toBe(1);
    expect(progress.cumulativeResponses).toBe(1);
  });

  it('links batch questionnaires to their study via protocol references', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [
        {
          resource: makeStudy('study-a', ['PlanDefinition/batch-1'])
        },
        { resource: makePlan('batch-1') }
      ]
    };

    const progress = parseResearchBundle(bundle, TODAY);
    expect(progress.studies[0].batches[0].questionnaireIds).toEqual([
      'phq2',
      'big-five-inventory'
    ]);
    expect(progress.studies[0].totalCount).toBe(2);
  });

  it('handles an empty bundle with no studies', () => {
    const progress = parseResearchBundle(
      { resourceType: 'Bundle', type: 'batch-response', entry: [] },
      TODAY
    );
    expect(progress.studies).toEqual([]);
    expect(progress.cumulativeResponses).toBe(0);
  });

  it('extracts consented study ids from on-study ResearchSubject entries', () => {
    const bundle: Bundle = {
      resourceType: 'Bundle',
      type: 'batch-response',
      entry: [
        {
          resource: {
            resourceType: 'Bundle',
            type: 'searchset',
            entry: [
              {
                resource: {
                  resourceType: 'ResearchSubject',
                  id: 'rs-1',
                  status: 'on-study',
                  study: { reference: 'ResearchStudy/study-a' },
                  individual: { reference: 'Patient/pat-1' }
                }
              },
              {
                resource: {
                  resourceType: 'ResearchSubject',
                  id: 'rs-2',
                  status: 'off-study',
                  study: { reference: 'ResearchStudy/study-b' },
                  individual: { reference: 'Patient/pat-1' }
                }
              }
            ]
          },
          response: { status: '200' }
        }
      ]
    };

    const progress = parseResearchBundle(bundle, TODAY);
    expect(progress.consentedStudyIds).toEqual(['study-a']);
  });
});
