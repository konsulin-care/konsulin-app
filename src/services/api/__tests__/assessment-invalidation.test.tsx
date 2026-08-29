import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { QuestionnaireResponse } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import {
  useSubmitQuestionnaire,
  useUpdateSubmitQuestionnaire
} from '../assessment';

vi.mock('../../api', () => ({ getAPI: vi.fn() }));

vi.mock('../../anonymous-session', () => ({
  ensureAnonymousSession: vi.fn(),
  buildAnonymousIdentifier: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { assessmentDrafts: 'assessment_drafts' },
  dbDelete: vi.fn(() => Promise.resolve())
}));

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

const MOCK_QR: QuestionnaireResponse = {
  resourceType: 'QuestionnaireResponse',
  id: 'QR-1',
  questionnaire: 'Questionnaire/phq2',
  status: 'completed',
  item: []
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('questionnaire submission research invalidation', () => {
  it('invalidates research queries after a successful submission', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const mockPost = vi.fn().mockResolvedValue({ data: MOCK_QR });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', true), {
      wrapper: createWrapper(queryClient)
    });

    await act(async () => {
      await result.current.mutateAsync(MOCK_QR);
    });

    expect(mockPost).toHaveBeenCalledWith(
      '/fhir/QuestionnaireResponse',
      expect.objectContaining({
        questionnaire: 'https://konsulin.care/fhir/Questionnaire/phq2'
      })
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['research'] });
  });

  it('invalidates research queries after updating an existing submission', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const mockPut = vi.fn().mockResolvedValue({ data: MOCK_QR });
    vi.mocked(getAPI).mockResolvedValue({
      put: mockPut
    } as unknown as AxiosInstance);

    const { result } = renderHook(
      () => useUpdateSubmitQuestionnaire('phq2', true),
      { wrapper: createWrapper(queryClient) }
    );

    await act(async () => {
      await result.current.mutateAsync(MOCK_QR);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['research'] });
  });
});
