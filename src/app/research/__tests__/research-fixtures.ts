import type { ResearchProgress, StudyProgress } from '@/utils/fhir/research';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

export const BATCH_1 = {
  id: 'batch-1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2', 'big-five-inventory']
};

/** Resolved questionnaire titles matching the research questionnaire ids. */
export const TITLE_MAP: Record<string, string> = {
  phq2: 'PHQ-2',
  'big-five-inventory': 'Big Five Inventory'
};

/** Base StudyProgress fixture for the mental-health survey study. */
export function makeStudyProgress(
  overrides?: Partial<StudyProgress>
): StudyProgress {
  return {
    study: {
      resourceType: 'ResearchStudy',
      id: 'research',
      status: 'active',
      title: 'Konsulin Mental Health Survey',
      description: 'A longitudinal survey of mental health.',
      period: { start: '2026-08-01', end: '2027-07-31' }
    },
    batches: [BATCH_1],
    currentBatch: BATCH_1,
    completedCount: 1,
    totalCount: 2,
    isComplete: false,
    firstUncompletedQuestionnaireId: 'big-five-inventory',
    completedQuestionnaireIds: ['phq2'],
    history: [
      {
        batchId: 'batch-1',
        start: '2026-08-01',
        end: '2026-08-31',
        participated: true
      }
    ],
    consecutiveBatches: 1,
    ...overrides
  };
}

/** Second concurrent study fixture for multi-study carousel tests. */
export function makeStudyB(overrides?: Partial<StudyProgress>): StudyProgress {
  return makeStudyProgress({
    study: {
      resourceType: 'ResearchStudy',
      id: 'study-b',
      status: 'active',
      title: 'Sleep Quality Study',
      description: 'Tracks sleep patterns over time.'
    },
    completedCount: 0,
    completedQuestionnaireIds: [],
    firstUncompletedQuestionnaireId: 'phq2',
    ...overrides
  });
}

/** Aggregate ResearchProgress fixture with level metadata. */
export function makeProgress(
  overrides?: Partial<ResearchProgress>
): ResearchProgress {
  return {
    studies: [makeStudyProgress()],
    cumulativeResponses: 1,
    currentLevel: {
      threshold: 1,
      label: 'Participant',
      reward: 'Standard result brief for every questionnaire'
    },
    nextLevel: {
      threshold: 5,
      label: 'Contributor',
      reward: 'Personalized summary report + badge'
    },
    levelProgress: {
      current: {
        threshold: 1,
        label: 'Participant',
        reward: 'Standard result brief for every questionnaire'
      },
      next: {
        threshold: 5,
        label: 'Contributor',
        reward: 'Personalized summary report + badge'
      },
      currentThreshold: 1,
      nextThreshold: 5,
      intoNext: 0,
      toNext: 4
    },
    completedQuestionnaireIds: ['phq2'],
    consentedStudyIds: [],
    ...overrides
  };
}

/**
 * QueryClientProvider wrapper with retries disabled for render tests.
 * Built with createElement so it can live in a plain .ts module.
 */
export function createResearchWrapper(): (props: {
  children: React.ReactNode;
}) => React.ReactElement {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
}
