import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  COMPLETION_COUNT_FLOOR,
  useStudyCompletionCounts,
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

describe('useStudyCompletionCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('sums canonical count queries and applies the k-anonymity floor', async () => {
    mockAxios.get.mockImplementation((url: string) => {
      const totals: Record<string, number> = {
        phq2: 32,
        'big-five-inventory': 2
      };
      const id = Object.keys(totals).find(key => url.includes(key));
      return Promise.resolve({ data: { total: id ? totals[id] : 0 } });
    });

    const { result } = renderHook(
      () => useStudyCompletionCounts(['phq2', 'big-five-inventory']),
      { wrapper: makeWrapper(makeQueryClient()) }
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual({ total: 34, visibleCount: 34 });
    expect(mockAxios.get).toHaveBeenCalledWith(
      `/fhir/QuestionnaireResponse?_summary=count&questionnaire=${CANONICAL}/phq2`
    );
    expect(mockAxios.get).toHaveBeenCalledWith(
      `/fhir/QuestionnaireResponse?_summary=count&questionnaire=${CANONICAL}/big-five-inventory`
    );
  });

  it('hides totals below the floor', async () => {
    mockAxios.get.mockResolvedValue({ data: { total: 4 } });

    const { result } = renderHook(() => useStudyCompletionCounts(['phq2']), {
      wrapper: makeWrapper(makeQueryClient())
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data).toEqual({ total: 4, visibleCount: null });
  });

  it('matches the verified live distribution (sum 42)', async () => {
    mockAxios.get.mockImplementation((url: string) => {
      const totals: Record<string, number> = {
        phq2: 32,
        'Questionnaire-id': 4,
        soap: 3,
        'big-five-inventory': 2,
        DH6HJ6Y4T24MYVBQ: 1
      };
      const id = Object.keys(totals).find(key => url.includes(key));
      return Promise.resolve({ data: { total: id ? totals[id] : 0 } });
    });

    const ids = [
      'phq2',
      'Questionnaire-id',
      'soap',
      'big-five-inventory',
      'DH6HJ6Y4T24MYVBQ'
    ];

    const { result } = renderHook(() => useStudyCompletionCounts(ids), {
      wrapper: makeWrapper(makeQueryClient())
    });

    await waitFor(() => {
      expect(result.current.data?.total).toBe(42);
    });

    expect(result.current.data?.visibleCount).toBe(42);
    expect(mockAxios.get).toHaveBeenCalledTimes(5);
  });

  it('serves one request per questionnaire within the stale window', async () => {
    mockAxios.get.mockImplementation((url: string) => {
      const totals: Record<string, number> = { phq2: 32, soap: 3 };
      const id = Object.keys(totals).find(key => url.includes(key));
      return Promise.resolve({ data: { total: id ? totals[id] : 0 } });
    });

    const queryClient = makeQueryClient();
    const wrapper = makeWrapper(queryClient);

    const first = renderHook(() => useStudyCompletionCounts(['phq2', 'soap']), {
      wrapper
    });
    await waitFor(() => {
      expect(first.result.current.data).toBeDefined();
    });
    first.unmount();

    const second = renderHook(
      () => useStudyCompletionCounts(['phq2', 'soap']),
      { wrapper }
    );
    await waitFor(() => {
      expect(second.result.current.data).toBeDefined();
    });

    // 2 ids => 2 network requests even across two hook mounts (cache hit).
    expect(mockAxios.get).toHaveBeenCalledTimes(2);
  });

  it('does not query when no questionnaire ids are given', () => {
    const { result } = renderHook(() => useStudyCompletionCounts([]), {
      wrapper: makeWrapper(makeQueryClient())
    });

    expect(result.current.isPending).toBe(true);
    expect(mockAxios.get).not.toHaveBeenCalled();
  });
});
