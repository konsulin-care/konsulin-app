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

const CANONICAL_BASE = 'https://konsulin.care/fhir/Questionnaire';

/** Expected comma-joined, per-canonical-encoded questionnaire filter. */
function questionnaireParam(ids: string[]): string {
  return ids.map(id => encodeURIComponent(`${CANONICAL_BASE}/${id}`)).join(',');
}

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

function searchset(entry: Bundle['entry']): Bundle {
  return { resourceType: 'Bundle', type: 'searchset', entry };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ensureAnonymousSession).mockResolvedValue('guest-1');
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useReportResponses', () => {
  it('fetches all completed responses in a single author-scoped query for patients, deduped and guarded', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: true, userInfo: { fhirId: 'pat-1' } },
      isLoading: false,
      dispatch: vi.fn()
    });

    const mockGet = vi.fn().mockResolvedValue({
      data: searchset([
        { resource: qr('r1', 'Questionnaire/phq2', '2026-08-15T10:00:00Z') },
        { resource: qr('r2', 'Questionnaire/ocean', '2026-08-16T10:00:00Z') },
        // Duplicate id: deduped by merge.
        { resource: qr('r1', 'Questionnaire/phq2', '2026-08-15T10:00:00Z') },
        // Not in the requested set: dropped by the client-side id guard.
        { resource: qr('r3', 'Questionnaire/gad7', '2026-08-17T10:00:00Z') }
      ])
    });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useReportResponses(['phq2', 'ocean']), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(ensureAnonymousSession).not.toHaveBeenCalled();
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('author=Patient/pat-1');
    expect(url).toContain(
      `questionnaire=${questionnaireParam(['ocean', 'phq2'])}`
    );
    expect(url).toContain('status=completed&_count=500');
    expect(url).not.toContain('identifier=');
    expect(url).not.toContain('authored=');
    expect(result.current.data?.map(r => r.id)).toEqual(['r1', 'r2']);
  });

  it('adds the authored=ge bound to the patient query when since is given', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: true, userInfo: { fhirId: 'pat-1' } },
      isLoading: false,
      dispatch: vi.fn()
    });

    const mockGet = vi.fn().mockResolvedValue({ data: searchset([]) });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    const { result } = renderHook(
      () => useReportResponses(['phq2'], '2026-08-01'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain('&authored=ge2026-08-01');
    expect(url).toContain(`questionnaire=${questionnaireParam(['phq2'])}`);
  });

  it('fetches guest responses in a single identifier-scoped query and merges drafts, server winning', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: {} },
      isLoading: false,
      dispatch: vi.fn()
    });

    const mockGet = vi.fn().mockResolvedValue({
      data: searchset([
        { resource: qr('s1', 'Questionnaire/phq2', '2026-08-15T10:00:00Z') },
        { resource: qr('s2', 'Questionnaire/ocean', '2026-08-16T10:00:00Z') }
      ])
    });
    vi.mocked(getAPI).mockResolvedValue({
      get: mockGet
    } as unknown as AxiosInstance);

    vi.mocked(dbGetAll).mockResolvedValue([
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
    expect(mockGet).toHaveBeenCalledTimes(1);
    const url = mockGet.mock.calls[0][0] as string;
    expect(url).toContain(
      `identifier=${encodeURIComponent(
        `${ANONYMOUS_SESSION_IDENTIFIER_SYSTEM}|guest-1`
      )}`
    );
    expect(url).toContain(
      `questionnaire=${questionnaireParam(['ocean', 'phq2'])}`
    );
    expect(url).toContain('status=completed&_count=500');
    expect(url).not.toContain('author=');
    expect(result.current.data?.map(r => r.id)).toEqual(['s1', 's2', 'd2']);
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
