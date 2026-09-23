/**
 * Shared test data for research form tests.
 *
 * Provides reusable mock data factories and constants.
 */
import type { PlanDefinition, ResearchStudy } from 'fhir/r4';

/** Default researcher auth state used across form tests. */
export const RESEARCHER_AUTH_STATE = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: {
      fhirId: 'test-practitioner-id',
      role_name: 'Researcher'
    }
  }
};

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
