import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle, QuestionnaireResponse } from 'fhir/r4';
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

vi.mock('@/services/anonymous-session', () => ({
  ensureAnonymousSession: vi.fn()
}));

import { ANONYMOUS_SESSION_IDENTIFIER_SYSTEM } from '@/constants/anonymous-session';
import { useAuth } from '@/context/auth/authContext';
import { dbGetAll } from '@/lib/indexeddb';
import { ensureAnonymousSession } from '@/services/anonymous-session';

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
function qr(
  id: string,
  questionnaire: string,
  authored: string
): QuestionnaireResponse {
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
  vi.mocked(ensureAnonymousSession).mockResolvedValue('guest-1');
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
    expect(ensureAnonymousSession).not.toHaveBeenCalled();
    const urls = mockGet.mock.calls.map(call => call[0] as string);
    expect(urls.some(url => url.includes('Questionnaire%2Fphq2'))).toBe(true);
    expect(urls.some(url => url.includes('Questionnaire%2Focean'))).toBe(true);
    expect(result.current.data).toHaveLength(2);
  });

  it('fetches guest responses per questionnaire by anonymous identifier and merges drafts, server winning', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false,
      dispatch: vi.fn()
    });

    const mockGet = vi.fn().mockImplementation((url: string) => {
      const searchset = (entry: Bundle['entry']) => ({
        data: { resourceType: 'Bundle', type: 'searchset', entry } as Bundle
      });
      if (url.includes('ocean')) {
        return Promise.resolve(
          searchset([
            {
              resource: qr('s2', 'Questionnaire/ocean', '2026-08-16T10:00:00Z')
            }
          ])
        );
      }
      return Promise.resolve(
        searchset([
          { resource: qr('s1', 'Questionnaire/phq2', '2026-08-15T10:00:00Z') }
        ])
      );
    });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: '',
        questionnaireId: 'phq2',
        response: qr('s1', 'Questionnaire/phq2', ''),
        updatedAt: 1
      },
      {
        ownerId: '',
        questionnaireId: 'ocean',
        response: qr('d2', 'Questionnaire/ocean', ''),
        updatedAt: 2
      },
      {
        ownerId: '',
        questionnaireId: 'gad7',
        response: qr('g3', 'Questionnaire/gad7', ''),
        updatedAt: 3
      }
    ]);

    const { result } = renderHook(() => useReportResponses(['phq2', 'ocean']), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(ensureAnonymousSession).toHaveBeenCalledWith(false);
    expect(mockGet).toHaveBeenCalledTimes(2);
    const encodedScope = encodeURIComponent(
      `${ANONYMOUS_SESSION_IDENTIFIER_SYSTEM}|guest-1`
    );
    const urls = mockGet.mock.calls.map(call => call[0] as string);
    for (const url of urls) {
      expect(url).toContain(`identifier=${encodedScope}`);
    }
    expect(urls.some(url => url.includes('Questionnaire%2Fphq2'))).toBe(true);
    expect(urls.some(url => url.includes('Questionnaire%2Focean'))).toBe(true);
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data?.map(r => r.id)).toEqual(['s2', 's1', 'd2']);
  });

  it('falls back to IndexedDB drafts when the guest server search fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false,
      dispatch: vi.fn()
    });

    vi.mocked(getAPI).mockResolvedValue({
      get: vi.fn().mockRejectedValue(new Error('offline'))
    } as unknown as AxiosInstance);

    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: '',
        questionnaireId: 'phq2',
        response: qr('g1', 'Questionnaire/phq2', ''),
        updatedAt: 1
      }
    ]);

    const { result } = renderHook(() => useReportResponses(['phq2']), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0]?.id).toBe('g1');
  });

  it('falls back to drafts when guest id resolution fails', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false,
      dispatch: vi.fn()
    });

    vi.mocked(ensureAnonymousSession).mockRejectedValue(
      new Error('no anonymous session')
    );

    vi.mocked(dbGetAll).mockResolvedValue([
      {
        ownerId: '',
        questionnaireId: 'phq2',
        response: qr('g1', 'Questionnaire/phq2', ''),
        updatedAt: 1
      }
    ]);

    const { result } = renderHook(() => useReportResponses(['phq2']), {
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
    expect(ensureAnonymousSession).not.toHaveBeenCalled();
  });
});
