import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import { useReportResponses } from '../report';

vi.mock('../../api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { assessmentDrafts: 'assessment_drafts' },
  dbGetAll: vi.fn()
}));

import { useAuth } from '@/context/auth/authContext';
import { dbGetAll } from '@/lib/indexeddb';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/** Minimal full QuestionnaireResponse for the report data layer. */
function qr(id: string, questionnaire: string, authored: string) {
  return {
    resourceType: 'QuestionnaireResponse',
    id,
    questionnaire,
    status: 'completed',
    authored,
    item: [
      {
        linkId: 'interpretation',
        item: [{ linkId: 'score-dimension', item: [] }]
      }
    ]
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useReportResponses', () => {
  it('fetches full responses per questionnaire for authenticated patients and dedupes', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: true, userInfo: { fhirId: 'pat-1' } },
      isLoading: false,
      dispatch: vi.fn()
    });

    const mockGet = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          resourceType: 'Bundle',
          type: 'searchset',
          entry: [
            { resource: qr('r1', 'Questionnaire/phq2', '2026-08-15T10:00:00Z') }
          ]
        } as Bundle
      })
      .mockResolvedValueOnce({
        data: {
          resourceType: 'Bundle',
          type: 'searchset',
          entry: [
            {
              resource: qr('r2', 'Questionnaire/ocean', '2026-08-16T10:00:00Z')
            }
          ]
        } as Bundle
      });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useReportResponses(['phq2', 'ocean']), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGet).toHaveBeenCalledTimes(2);
    const urls = mockGet.mock.calls.map(call => call[0] as string);
    expect(urls.some(url => url.includes('Questionnaire%2Fphq2'))).toBe(true);
    expect(urls.some(url => url.includes('Questionnaire%2Focean'))).toBe(true);
    expect(result.current.data).toHaveLength(2);
  });

  it('reads guest responses from IndexedDB drafts filtered by questionnaire id', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false,
      dispatch: vi.fn()
    });

    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: '',
        questionnaireId: 'phq2',
        response: qr('g1', 'Questionnaire/phq2', ''),
        updatedAt: 1
      },
      {
        ownerId: '',
        questionnaireId: 'gad7',
        response: qr('g2', 'Questionnaire/gad7', ''),
        updatedAt: 2
      }
    ]);

    const { result } = renderHook(() => useReportResponses(['phq2', 'ocean']), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe('g1');
  });

  it('stays disabled without questionnaire ids', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false,
      dispatch: vi.fn()
    });

    const { result } = renderHook(() => useReportResponses([]), {
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
  });
});
