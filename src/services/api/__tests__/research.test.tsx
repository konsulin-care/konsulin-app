import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle, PlanDefinition, ResearchStudy } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import {
  buildQuestionnaireResponseSearch,
  buildStudiesBundle,
  useResearchProgress
} from '../research';

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

const EMPTY_BATCH_RESPONSE: Bundle = {
  resourceType: 'Bundle',
  type: 'batch-response',
  entry: []
};

const researchStudy = (id: string, periodStart: string): ResearchStudy => ({
  resourceType: 'ResearchStudy',
  id,
  status: 'active',
  period: { start: periodStart, end: '2027-07-31' },
  protocol: [{ reference: 'PlanDefinition/batch-1' }]
});

const batchPlan = (id: string): PlanDefinition => ({
  resourceType: 'PlanDefinition',
  id,
  status: 'active',
  effectivePeriod: { start: '2026-08-01', end: '2026-08-31' },
  action: [
    { definitionCanonical: 'Questionnaire/phq2' },
    { definitionCanonical: 'Questionnaire/big-five-inventory' }
  ]
});

/** Batch-response for the studies bundle: study + batch plan in a searchset. */
const STUDIES_BATCH_RESPONSE: Bundle = {
  resourceType: 'Bundle',
  type: 'batch-response',
  entry: [
    {
      resource: {
        resourceType: 'Bundle',
        type: 'searchset',
        entry: [
          { resource: researchStudy('study-a', '2026-06-01') },
          { resource: batchPlan('batch-1') }
        ]
      },
      response: { status: '200' }
    }
  ]
};

/** Plain searchset returned by the QuestionnaireResponse GET. */
const QR_SEARCHSET: Bundle = {
  resourceType: 'Bundle',
  type: 'searchset',
  total: 1,
  entry: [
    {
      resource: {
        resourceType: 'QuestionnaireResponse',
        id: 'QR-1',
        questionnaire: 'Questionnaire/phq2',
        status: 'completed',
        authored: '2026-08-10T00:00:00Z'
      }
    }
  ]
};

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

describe('buildStudiesBundle', () => {
  it('builds a batch bundle with study and ResearchSubject searches for a patient', () => {
    const bundle = buildStudiesBundle(
      { kind: 'patient', id: 'PAT-1' },
      '2026-08-01'
    );
    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls).toHaveLength(2);
    expect(urls[0]).toBe(
      'ResearchStudy?date=ge2026-08-01&status=active&_include=ResearchStudy:protocol'
    );
    expect(urls[1]).toBe(
      'ResearchSubject?patient=Patient/PAT-1&_elements=study,status&_count=100'
    );
  });

  it('builds a study-only bundle for guests without a patient id', () => {
    const bundle = buildStudiesBundle(
      { kind: 'guest', id: 'GUEST-UUID' },
      '2026-08-01'
    );
    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls).toHaveLength(1);
    expect(urls[0]).toContain('ResearchStudy?date=ge2026-08-01');
    expect(urls.some(url => url.startsWith('ResearchSubject?'))).toBe(false);
  });
});

describe('buildQuestionnaireResponseSearch', () => {
  it('scopes the search to the patient author with the earliest study start', () => {
    const url = buildQuestionnaireResponseSearch(
      { kind: 'patient', id: 'PAT-1' },
      '2026-06-01'
    );
    expect(url).toContain('author=Patient/PAT-1');
    expect(url).toContain('authored=ge2026-06-01');
    expect(url).toContain(
      'status=completed&_elements=questionnaire,authored&_count=500'
    );
    expect(url).not.toContain('identifier=');
  });

  it('scopes the search to the guest identifier with the earliest study start', () => {
    const url = buildQuestionnaireResponseSearch(
      { kind: 'guest', id: 'GUEST-UUID' },
      '2026-06-01'
    );
    expect(url).toContain('identifier=');
    expect(url).toContain(
      encodeURIComponent('https://login.konsulin.care/guestid|GUEST-UUID')
    );
    expect(url).toContain('authored=ge2026-06-01');
    expect(url).not.toContain('author=');
  });

  it('omits the authored bound when no study declares a period start', () => {
    const url = buildQuestionnaireResponseSearch(
      { kind: 'guest', id: 'GUEST-UUID' },
      null
    );
    expect(url).toContain('identifier=');
    expect(url).not.toContain('authored=');
  });
});

describe('useResearchProgress', () => {
  it('posts the studies bundle then fetches patient-scoped responses', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockPost, mockGet } = mockApi({
      post: vi.fn().mockResolvedValue({ data: STUDIES_BATCH_RESPONSE })
    });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: createWrapper()
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
      wrapper: createWrapper()
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
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledTimes(1);
    expect(mockGet).not.toHaveBeenCalled();
    expect(result.current.data?.cumulativeResponses).toBe(0);
    expect(result.current.data?.studies).toEqual([]);
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
      wrapper: createWrapper()
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
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(true);
  });

  it('stops loading when the anonymous session fails to resolve', async () => {
    mockUseAuth.mockReturnValue(GUEST_STATE);
    mockEnsureAnonymousSession.mockRejectedValue(
      new Error('anonymous session failed')
    );

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: createWrapper()
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
      wrapper: createWrapper()
    });

    expect(result.current.isLoading).toBe(false);
  });
});
