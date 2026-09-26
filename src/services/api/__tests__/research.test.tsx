import {
  EMPTY_BATCH_RESPONSE,
  makeQRSearchSet,
  makeStudiesBatchResponse
} from '@/__tests__/fixtures/research-api-mocks';
import { wrapper } from '@/__tests__/react-test-utils';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import { useResearchProgress } from '../research';

const { mockUseAuth, mockEnsureAnonymousSession } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<
    () => {
      isLoading: boolean;
      state: {
        isAuthenticated: boolean;
        userInfo: { fhirId?: string; role_name?: string };
      };
    }
  >(),
  mockEnsureAnonymousSession: vi.fn<() => Promise<string>>()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('../../anonymous-session', () => ({
  ensureAnonymousSession: mockEnsureAnonymousSession
}));

vi.mock('../../api', () => ({
  getAPI: vi.fn()
}));

/** Batch-response for the studies bundle: study + batch plan in a searchset. */
const STUDIES_BATCH_RESPONSE = makeStudiesBatchResponse([
  { id: 'study-a', periodStart: '2026-06-01' }
]);

/** Plain searchset returned by the QuestionnaireResponse GET. */
const QR_SEARCHSET = makeQRSearchSet([
  {
    id: 'QR-1',
    questionnaire: 'Questionnaire/phq2',
    authored: '2026-09-10T00:00:00Z'
  }
]);

const PATIENT_STATE = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: { fhirId: 'PAT-1', role_name: 'Patient' }
  }
};

const GUEST_STATE = {
  isLoading: false,
  state: { isAuthenticated: false, userInfo: {} }
};

/** API mock exposing post (studies bundle) and get (QR searchset). */
function mockApi(
  overrides: Partial<{
    post: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
  }> = {}
) {
  const mockPost =
    overrides.post ?? vi.fn().mockResolvedValue({ data: EMPTY_BATCH_RESPONSE });
  const mockGet =
    overrides.get ?? vi.fn().mockResolvedValue({ data: QR_SEARCHSET });
  vi.mocked(getAPI).mockResolvedValue({
    post: mockPost,
    get: mockGet
  } as unknown as AxiosInstance);
  return { mockPost, mockGet };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('useResearchProgress', () => {
  it('posts the studies bundle then fetches patient-scoped responses', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockPost, mockGet } = mockApi({
      post: vi.fn().mockResolvedValue({ data: STUDIES_BATCH_RESPONSE })
    });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Request 1: studies bundle batch with ResearchSubject for patients.
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockPost).toHaveBeenCalledWith(
      '/fhir',
      expect.objectContaining({ type: 'batch' })
    );
    const urls =
      (mockPost.mock.calls[0][1] as Bundle).entry?.map(e => e.request?.url) ??
      [];
    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain('ResearchStudy?');
    expect(urls[1]).toContain('ResearchSubject?patient=Patient/PAT-1');

    // Request 2: QR search scoped by author, bounded by the earliest study start.
    expect(mockGet).toHaveBeenCalledTimes(1);
    const qrUrl = mockGet.mock.calls[0][0] as string;
    expect(qrUrl).toContain('author=Patient/PAT-1');
    expect(qrUrl).toContain('authored=ge2026-06-01');

    expect(result.current.data?.cumulativeResponses).toBe(1);
    expect(result.current.data?.studies[0].completedCount).toBe(1);
    expect(result.current.data?.questionnaireResponses).toEqual(['phq2']);
    expect(result.current.data?.questionnaireXp).toBe(5);
  });

  it('resolves guest identity and fetches responses by anonymous identifier', async () => {
    mockUseAuth.mockReturnValue(GUEST_STATE);
    mockEnsureAnonymousSession.mockResolvedValue('GUEST-UUID');
    const { mockPost, mockGet } = mockApi({
      post: vi.fn().mockResolvedValue({ data: STUDIES_BATCH_RESPONSE })
    });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEnsureAnonymousSession).toHaveBeenCalled();

    const urls =
      (mockPost.mock.calls[0][1] as Bundle).entry?.map(e => e.request?.url) ??
      [];
    expect(urls).toHaveLength(1);
    expect(urls.some(url => url.startsWith('ResearchSubject?'))).toBe(false);

    const qrUrl = mockGet.mock.calls[0][0] as string;
    expect(qrUrl).toContain(
      encodeURIComponent('https://login.konsulin.care/guestid|GUEST-UUID')
    );
    expect(qrUrl).toContain('authored=ge2026-06-01');
  });

  it('skips the response fetch entirely when no studies are active', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockPost, mockGet } = mockApi();

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.data?.cumulativeResponses).toBe(0);
    expect(result.current.data?.studies).toEqual([]);
  });

  it('skips the response search entirely when skipResponseSearch is set', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockPost, mockGet } = mockApi({
      post: vi.fn().mockResolvedValue({ data: STUDIES_BATCH_RESPONSE })
    });

    const { result } = renderHook(
      () => useResearchProgress({ skipResponseSearch: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
    // Batch structure stays populated even without the response search.
    expect(result.current.data?.studies[0].batches[0].questionnaireIds).toEqual(
      ['phq2', 'big-five-inventory']
    );
    expect(result.current.data?.studies[0].currentBatch?.id).toBe('batch-1');
    expect(result.current.data?.cumulativeResponses).toBe(0);
  });

  it('does not fetch while auth is loading', () => {
    mockUseAuth.mockReturnValue({
      isLoading: true,
      state: { isAuthenticated: false, userInfo: {} }
    });
    const mockPost = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    expect(result.current.isFetching).toBe(false);
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('reports loading while guest identity resolution is in flight', () => {
    mockUseAuth.mockReturnValue(GUEST_STATE);
    // Never resolves: guest session stays in flight.
    mockEnsureAnonymousSession.mockReturnValue(
      new Promise<string>(() => {
        /* never settles */
      })
    );

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('stops loading when the anonymous session fails to resolve', async () => {
    mockUseAuth.mockReturnValue(GUEST_STATE);
    mockEnsureAnonymousSession.mockRejectedValue(
      new Error('anonymous session failed')
    );

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeUndefined();
  });

  it('never reports loading for ineligible authenticated users without a fhir id', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: true, userInfo: { role_name: 'Practitioner' } }
    });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('returns no data and no loading for a researcher with a fhir id', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { fhirId: 'PRAC-1', role_name: 'Researcher' }
      }
    });
    const mockPost = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('returns no data and no loading for a clinic admin with a fhir id', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { fhirId: 'ADMIN-1', role_name: 'Clinic Admin' }
      }
    });
    const mockPost = vi.fn();
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeUndefined();
    expect(mockPost).not.toHaveBeenCalled();
  });
});
