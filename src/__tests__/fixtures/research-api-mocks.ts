/**
 * Shared FHIR resource factories for research API tests.
 *
 * Provides reusable builders for ResearchStudy, PlanDefinition,
 * and common Bundle responses used across test files.
 */
import type { Bundle, PlanDefinition, ResearchStudy } from 'fhir/r4';

/** Create a ResearchStudy resource. */
export function makeResearchStudy(
  id: string,
  periodStart: string,
  options: Partial<ResearchStudy> = {}
): ResearchStudy {
  return {
    resourceType: 'ResearchStudy',
    id,
    status: 'active',
    period: { start: periodStart, end: '2027-07-31' },
    protocol: [{ reference: 'PlanDefinition/batch-1' }],
    ...options
  };
}

/** Create a PlanDefinition resource with questionnaire actions. */
export function makeBatchPlan(
  id: string,
  questionnaireIds: string[] = ['phq2', 'big-five-inventory']
): PlanDefinition {
  return {
    resourceType: 'PlanDefinition',
    id,
    status: 'active',
    effectivePeriod: { start: '2026-09-01', end: '2026-09-30' },
    action: questionnaireIds.map(qId => ({
      definitionCanonical: `Questionnaire/${qId}`
    }))
  };
}

/** Empty batch response for when no data is returned. */
export const EMPTY_BATCH_RESPONSE: Bundle = {
  resourceType: 'Bundle',
  type: 'batch-response',
  entry: []
};

/**
 * Create a studies batch response containing studies and batch plans.
 * @param studies - Array of { id, periodStart } for studies
 * @param batchId - ID for the batch plan
 */
export function makeStudiesBatchResponse(
  studies: Array<{ id: string; periodStart: string }>,
  batchId = 'batch-1'
): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'batch-response',
    entry: [
      {
        resource: {
          resourceType: 'Bundle',
          type: 'searchset',
          entry: [
            ...studies.map(s => ({
              resource: makeResearchStudy(s.id, s.periodStart)
            })),
            { resource: makeBatchPlan(batchId) }
          ]
        },
        response: { status: '200' }
      }
    ]
  };
}

/** Create a QuestionnaireResponse searchset bundle. */
export function makeQRSearchSet(
  responses: Array<{
    id: string;
    questionnaire: string;
    authored: string;
  }> = []
): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: responses.length,
    entry: responses.map(r => ({
      resource: {
        resourceType: 'QuestionnaireResponse',
        id: r.id,
        questionnaire: r.questionnaire,
        status: 'completed',
        authored: r.authored
      }
    }))
  };
}
