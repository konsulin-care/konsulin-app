import type {
  ResearchBatch,
  ResearchProgress,
  StudyProgress
} from '@/utils/fhir/research';
import { QueryClient } from '@tanstack/react-query';
import type { AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import { prefetchCurrentBatchQuestionnaires } from '../research-prefetch';

vi.mock('../../api', () => ({ getAPI: vi.fn() }));

const QUESTIONNAIRE_BUNDLE = {
  data: {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: []
  }
};

const CURRENT_BATCH: ResearchBatch = {
  id: 'batch-1',
  start: '2026-09-01',
  end: '2026-09-30',
  questionnaireIds: ['phq2', 'gad7']
};

const COMPLETED_BATCH: ResearchBatch = {
  id: 'batch-0',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['who5']
};

/** Build a study progress entry with sane defaults for the prefetch tests. */
function makeStudy(
  id: string,
  overrides: Partial<StudyProgress> = {}
): StudyProgress {
  return {
    study: { resourceType: 'ResearchStudy', id, status: 'active' },
    batches: [],
    currentBatch: null,
    completedCount: 0,
    totalCount: 0,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: [],
    history: [],
    consecutiveBatches: 0,
    ...overrides
  };
}

/** Build a full research progress snapshot from study entries. */
function makeProgress(studies: StudyProgress[]): ResearchProgress {
  return {
    studies,
    cumulativeResponses: 0,
    questionnaireResponses: [],
    questionnaireXp: 0,
    completedQuestionnaireIds: [],
    consentedStudyIds: []
  };
}

const mockGet = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockResolvedValue(QUESTIONNAIRE_BUNDLE);
  vi.mocked(getAPI).mockResolvedValue({
    get: mockGet
  } as unknown as AxiosInstance);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('prefetchCurrentBatchQuestionnaires', () => {
  it('prefetches each uncompleted questionnaire in the current batch', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    await prefetchCurrentBatchQuestionnaires(
      queryClient,
      makeProgress([
        makeStudy('study-a', {
          currentBatch: CURRENT_BATCH,
          completedQuestionnaireIds: ['phq2']
        })
      ])
    );

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet).toHaveBeenCalledWith('/fhir/Questionnaire?_id=gad7');
    expect(queryClient.getQueryState(['assessments', 'gad7'])).toBeDefined();
    expect(queryClient.getQueryState(['assessments', 'phq2'])).toBeUndefined();
  });

  it('does not prefetch completed questionnaires or studies without a current batch', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    await prefetchCurrentBatchQuestionnaires(
      queryClient,
      makeProgress([
        makeStudy('study-a', {
          currentBatch: CURRENT_BATCH,
          completedQuestionnaireIds: ['phq2', 'gad7']
        }),
        makeStudy('study-b', {
          currentBatch: null,
          batches: [COMPLETED_BATCH]
        })
      ])
    );

    expect(mockGet).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(['assessments', 'phq2'])).toBeUndefined();
    expect(queryClient.getQueryState(['assessments', 'gad7'])).toBeUndefined();
  });

  it('prefetches nothing while navigator.onLine is false', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });

    await prefetchCurrentBatchQuestionnaires(
      queryClient,
      makeProgress([
        makeStudy('study-a', {
          currentBatch: CURRENT_BATCH
        })
      ])
    );

    expect(mockGet).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(['assessments', 'phq2'])).toBeUndefined();
    expect(queryClient.getQueryState(['assessments', 'gad7'])).toBeUndefined();
  });
});
