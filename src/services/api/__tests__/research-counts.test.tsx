import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as researchCounts from '../research-counts';
import {
  COMPLETION_COUNT_FLOOR,
  usePerQuestionnaireCounts,
  useStudyParticipantCount,
  withKAnonymityFloor
} from '../research-counts';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxios = { get: vi.fn() };

function makeWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

const CANONICAL = 'https://konsulin.care/fhir/Questionnaire';
const THIRTY_MINUTES = 30 * 60_000;

describe('withKAnonymityFloor', () => {
  it('returns totals at or above the floor', () => {
    expect(withKAnonymityFloor(42)).toBe(42);
    expect(withKAnonymityFloor(5)).toBe(5);
  });

  it('returns null below the floor', () => {
    expect(withKAnonymityFloor(4)).toBeNull();
    expect(withKAnonymityFloor(0)).toBeNull();
    expect(withKAnonymityFloor(COMPLETION_COUNT_FLOOR - 1)).toBeNull();
  });

  it('honors a custom floor', () => {
    expect(withKAnonymityFloor(9, 10)).toBeNull();
    expect(withKAnonymityFloor(10, 10)).toBe(10);
  });
});

describe('research-counts exports', () => {
  it('no longer exports useStudyCompletionCounts', () => {
    expect(researchCounts).not.toHaveProperty('useStudyCompletionCounts');
  });
});

describe('usePerQuestionnaireCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('returns a map of questionnaire id to count', async () => {
    mockAxios.get.mockResolvedValue({ data: { total: 7 } });

    const { result } = renderHook(
      () => usePerQuestionnaireCounts(['phq2', 'soap']),
      { wrapper: makeWrapper(makeQueryClient()) }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual(
      new Map([
        ['phq2', 7],
        ['soap', 7]
      ])
    );
    expect(mockAxios.get).toHaveBeenCalledWith(
      `/fhir/QuestionnaireResponse?_summary=count&questionnaire=${CANONICAL}/phq2`
    );
    expect(mockAxios.get).toHaveBeenCalledWith(
      `/fhir/QuestionnaireResponse?_summary=count&questionnaire=${CANONICAL}/soap`
    );
  });

  it('issues every request before any response resolves', async () => {
    const pending: Array<(value: unknown) => void> = [];
    mockAxios.get.mockImplementation(
      () =>
        new Promise(resolve => {
          pending.push(resolve);
        })
    );

    const { result } = renderHook(
      () => usePerQuestionnaireCounts(['phq2', 'soap', 'gad7']),
      { wrapper: makeWrapper(makeQueryClient()) }
    );

    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledTimes(3);
    });
    expect(pending).toHaveLength(3);
    expect(result.current.data).toBeUndefined();

    pending.forEach(resolve => resolve({ data: { total: 1 } }));
    await waitFor(() => {
      expect(result.current.data?.size).toBe(3);
    });
  });

  it('uses a 30-minute staleTime', async () => {
    mockAxios.get.mockResolvedValue({ data: { total: 1 } });

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => usePerQuestionnaireCounts(['phq2']), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const query = queryClient
      .getQueryCache()
      .find({ queryKey: ['per-questionnaire-counts', ['phq2']] });
    expect(query?.observers[0]?.options.staleTime).toBe(THIRTY_MINUTES);
  });

  it('does not query when no questionnaire ids are given', () => {
    const { result } = renderHook(() => usePerQuestionnaireCounts([]), {
      wrapper: makeWrapper(makeQueryClient())
    });

    expect(result.current.isPending).toBe(true);
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});

describe('useStudyParticipantCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('returns participant count for a study', async () => {
    mockAxios.get.mockResolvedValue({ data: { total: 7 } });

    const { result } = renderHook(() => useStudyParticipantCount('study-1'), {
      wrapper: makeWrapper(makeQueryClient())
    });

    await waitFor(() => {
      expect(result.current.data).toBe(7);
    });

    expect(mockAxios.get).toHaveBeenCalledWith(
      '/fhir/ResearchSubject?study=ResearchStudy/study-1&_summary=count'
    );
  });

  it('uses a 30-minute staleTime', async () => {
    mockAxios.get.mockResolvedValue({ data: { total: 7 } });

    const queryClient = makeQueryClient();
    const { result } = renderHook(() => useStudyParticipantCount('study-1'), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => {
      expect(result.current.data).toBe(7);
    });

    const query = queryClient
      .getQueryCache()
      .find({ queryKey: ['study-participant-count', 'study-1'] });
    expect(query?.observers[0]?.options.staleTime).toBe(THIRTY_MINUTES);
  });

  it('does not query when studyId is undefined', () => {
    const { result } = renderHook(() => useStudyParticipantCount(undefined), {
      wrapper: makeWrapper(makeQueryClient())
    });

    expect(result.current.isPending).toBe(true);
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});
