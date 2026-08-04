import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  useFilterRecordPractitionerByDate,
  useRecordSummaryPractitioner
} from '../record';

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

import { getAPI } from '@/services/api';

const mockAxios = { post: vi.fn() };

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

type BatchPayload = {
  entry?: Array<{ request?: { url?: string } }>;
};

describe('practitioner SOAP queries use the canonical questionnaire url', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAPI).mockResolvedValue(
      mockAxios as unknown as Awaited<ReturnType<typeof getAPI>>
    );
  });

  it('useRecordSummaryPractitioner filters SOAP responses by canonical url', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useRecordSummaryPractitioner(), {
      wrapper: makeWrapper(makeQueryClient())
    });

    result.current.mutate({ patientId: 'pat-1' });

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalled();
    });

    const payload = mockAxios.post.mock.calls[0]?.[1] as BatchPayload;
    const urls = (payload.entry ?? []).map(e => e.request?.url ?? '');
    expect(urls).toContain(
      '/QuestionnaireResponse?patient=pat-1&questionnaire=https://konsulin.care/fhir/Questionnaire/soap&_sorted=-_lastUpdated'
    );
  });

  it('useFilterRecordPractitionerByDate filters SOAP responses by canonical url', async () => {
    mockAxios.post.mockResolvedValue({ data: {} });

    const { result } = renderHook(() => useFilterRecordPractitionerByDate(), {
      wrapper: makeWrapper(makeQueryClient())
    });

    result.current.mutate({
      patientId: 'pat-1',
      startDate: '2024-01-01',
      endDate: '2024-01-31'
    });

    await waitFor(() => {
      expect(mockAxios.post).toHaveBeenCalled();
    });

    const payload = mockAxios.post.mock.calls[0]?.[1] as BatchPayload;
    const urls = (payload.entry ?? []).map(e => e.request?.url ?? '');
    const soapUrl = urls.find(url => url.includes('questionnaire='));
    expect(soapUrl).toContain(
      'questionnaire=https://konsulin.care/fhir/Questionnaire/soap'
    );
    expect(soapUrl).not.toContain('questionnaire=Questionnaire/soap');
  });
});
