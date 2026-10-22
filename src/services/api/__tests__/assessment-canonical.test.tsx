import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useQuestionnaireResponse,
  useSubmitQuestionnaire,
  useUpdateSubmitQuestionnaire
} from '../assessment';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { assessmentDrafts: 'assessmentDrafts' },
  dbDelete: vi.fn().mockResolvedValue(undefined as never)
}));

import { getAPI } from '@/services/api';

const mockAxios = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn()
};

const CANONICAL_PHQ2 = 'https://konsulin.care/fhir/Questionnaire/phq2';

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

describe('useSubmitQuestionnaire canonical payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('posts a QuestionnaireResponse with the canonical questionnaire url', async () => {
    mockAxios.post.mockResolvedValue({ data: { id: 'qr-new' } });

    const { result } = renderHook(() => useSubmitQuestionnaire('phq2', true), {
      wrapper: makeWrapper(makeQueryClient())
    });

    result.current.mutate({
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      item: []
    });

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalledWith(
        '/fhir/QuestionnaireResponse',
        expect.objectContaining({ questionnaire: CANONICAL_PHQ2 })
      );
    });
  });
});

describe('useUpdateSubmitQuestionnaire canonical payload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('puts a QuestionnaireResponse with the canonical questionnaire url', async () => {
    mockAxios.put.mockResolvedValue({ data: { id: 'qr-9' } });

    const { result } = renderHook(
      () => useUpdateSubmitQuestionnaire('phq2', true),
      { wrapper: makeWrapper(makeQueryClient()) }
    );

    result.current.mutate({
      id: 'qr-9',
      resourceType: 'QuestionnaireResponse',
      status: 'completed',
      item: []
    });

    await waitFor(() => {
      expect(mockAxios.put).toHaveBeenCalledWith(
        '/fhir/QuestionnaireResponse/qr-9',
        expect.objectContaining({ questionnaire: CANONICAL_PHQ2 })
      );
    });
  });
});

describe('useQuestionnaireResponse query url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('queries with the canonical form of the passed questionnaireId instead of the hardcoded big-five', async () => {
    mockAxios.get.mockResolvedValue({ data: { entry: [] } });

    renderHook(
      () =>
        useQuestionnaireResponse({
          questionnaireId: 'phq2',
          patientId: 'pat-1',
          enabled: true
        }),
      { wrapper: makeWrapper(makeQueryClient()) }
    );

    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledWith(
        '/fhir/QuestionnaireResponse?patient=pat-1&questionnaire=https://konsulin.care/fhir/Questionnaire/phq2&_elements=item&_sort=-_lastUpdated'
      );
    });
  });

  it('omits the questionnaire param when no questionnaireId is given', async () => {
    mockAxios.get.mockResolvedValue({ data: { entry: [] } });

    renderHook(
      () =>
        useQuestionnaireResponse({
          patientId: 'pat-1',
          enabled: true
        }),
      { wrapper: makeWrapper(makeQueryClient()) }
    );

    await waitFor(() => {
      expect(mockAxios.get).toHaveBeenCalledWith(
        '/fhir/QuestionnaireResponse?patient=pat-1&_elements=item&_sort=-_lastUpdated'
      );
    });
  });
});
