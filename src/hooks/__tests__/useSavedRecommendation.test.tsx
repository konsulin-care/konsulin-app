import { RecommendationProvider } from '@/context/recommendationContext';
import type { InterviewResult } from '@/types/recommendation-interview';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/recommendation-interview', () => ({
  readLastInterviewResult: vi.fn().mockResolvedValue(null)
}));

const { mockInvalidateQueries } = vi.hoisted(() => ({
  mockInvalidateQueries: vi.fn()
}));

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries
    }))
  };
});

import { useSavedRecommendation } from '../useSavedRecommendation';

const RESULT: InterviewResult = {
  complaintId: 'anxiety',
  complaintLabel: 'Anxiety',
  specialty: 'psychiatry',
  serviceTypeCode: 'anxiety-care',
  icfDomain: 'mental-emotional-health',
  redFlag: { isEmergency: false, label: 'Are you safe?', resources: [] }
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

function renderUseSavedRecommendation() {
  return renderHook(() => useSavedRecommendation(), {
    wrapper: ({ children }) => (
      <RecommendationProvider>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </RecommendationProvider>
    )
  });
}

describe('useSavedRecommendation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalidates recommendation queries and propagates via context when screening completes', () => {
    const { result } = renderUseSavedRecommendation();

    act(() => {
      result.current.handleComplete(RESULT);
    });

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['recommendations']
    });
    expect(result.current.savedResult).toEqual(RESULT);
  });
});
