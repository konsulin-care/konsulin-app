import type { ResearchStudyWithBatches } from '@/services/api/researcher';

/**
 * Create a researcher study fixture for testing.
 * @param id - Study ID
 * @param overrides - Partial overrides
 */
export function makeResearcherStudy(
  id = 'study-1',
  overrides?: Partial<ResearchStudyWithBatches>
): ResearchStudyWithBatches {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id,
      title: 'Mental Health Survey',
      status: 'active',
      description: 'A study about mental health'
    },
    batches: [
      {
        id: `${id}-batch-0`,
        start: '2026-01-01',
        end: '2026-12-31',
        questionnaireIds: ['phq2', 'big-five-inventory']
      }
    ],
    currentBatch: {
      id: `${id}-batch-0`,
      start: '2026-01-01',
      end: '2026-12-31',
      questionnaireIds: ['phq2', 'big-five-inventory']
    },
    daysRemaining: 100,
    ...overrides
  };
}

/** Default researcher dashboard response data. */
export const RESEARCHER_DASHBOARD_DATA = {
  studies: [makeResearcherStudy()],
  totalParticipants: 42
};
