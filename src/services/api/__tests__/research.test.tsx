import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import {
  buildConsentBundle,
  buildResearchBundle,
  useConsentToStudy,
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

const { mockSubmitFhirBundle } = vi.hoisted(() => ({
  mockSubmitFhirBundle: vi.fn<(bundle: Bundle) => Promise<Bundle>>()
}));

vi.mock('@/services/api/fhir-bundle', () => ({
  submitFhirBundle: mockSubmitFhirBundle
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

const PATIENT_STATE = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: { fhirId: 'PAT-1', role_name: 'Patient' }
  }
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildResearchBundle', () => {
  it('builds a batch bundle with study and identity searches for a patient', () => {
    const bundle = buildResearchBundle(
      { kind: 'patient', id: 'PAT-1' },
      '2026-08-01'
    );

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('batch');

    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls).toHaveLength(4);
    expect(urls[0]).toBe(
      'ResearchStudy?date=ge2026-08-01&status=active&_include=ResearchStudy:protocol'
    );
    expect(urls[1]).toBe(
      'QuestionnaireResponse?author=Patient/PAT-1&status=completed&_elements=questionnaire,authored&_count=500'
    );
    expect(urls[2]).toContain('QuestionnaireResponse?identifier=');
    expect(urls[2]).toContain(
      encodeURIComponent('https://login.konsulin.care/guestid|PAT-1')
    );
    expect(urls[3]).toBe(
      'ResearchSubject?patient=Patient/PAT-1&_elements=study,status&_count=100'
    );
  });

  it('omits the ResearchSubject search for guests without a patient id', () => {
    const bundle = buildResearchBundle(
      { kind: 'guest', id: 'GUEST-UUID' },
      '2026-08-01'
    );

    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls).toHaveLength(3);
    expect(urls.some(url => url.startsWith('ResearchSubject?'))).toBe(false);
  });
});

describe('buildConsentBundle', () => {
  it('creates an active research-scoped Consent for the patient', () => {
    const bundle = buildConsentBundle('PAT-1', 'study-a');

    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toHaveLength(2);
    expect(bundle.entry?.[0].fullUrl).toMatch(/^urn:uuid:/);
    expect(bundle.entry?.[0].request).toEqual({
      method: 'POST',
      url: 'Consent'
    });
    expect(bundle.entry?.[0].resource).toMatchObject({
      resourceType: 'Consent',
      status: 'active',
      scope: { coding: [{ code: 'research' }] },
      category: [{ coding: [{ code: 'research' }] }],
      patient: { reference: 'Patient/PAT-1' }
    });
  });

  it('links an on-study ResearchSubject to the Consent via its urn', () => {
    const bundle = buildConsentBundle('PAT-1', 'study-a');
    const consentFullUrl = bundle.entry?.[0].fullUrl;

    expect(bundle.entry?.[1].fullUrl).toMatch(/^urn:uuid:/);
    expect(bundle.entry?.[1].request).toEqual({
      method: 'POST',
      url: 'ResearchSubject'
    });
    expect(bundle.entry?.[1].resource).toMatchObject({
      resourceType: 'ResearchSubject',
      status: 'on-study',
      study: { reference: 'ResearchStudy/study-a' },
      individual: { reference: 'Patient/PAT-1' },
      consent: { reference: consentFullUrl }
    });
  });
});

describe('useResearchProgress', () => {
  it('resolves patient identity and posts a batch bundle to /fhir', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const mockPost = vi.fn().mockResolvedValue({ data: EMPTY_BATCH_RESPONSE });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockPost).toHaveBeenCalledWith(
      '/fhir',
      expect.objectContaining({ type: 'batch' })
    );
    const bundle = mockPost.mock.calls[0][1] as Bundle;
    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls[1]).toContain('author=Patient/PAT-1');
    expect(result.current.data?.cumulativeResponses).toBe(0);
  });

  it('resolves guest identity via ensureAnonymousSession and searches by identifier', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: false, userInfo: {} }
    });
    mockEnsureAnonymousSession.mockResolvedValue('GUEST-UUID');
    const mockPost = vi.fn().mockResolvedValue({ data: EMPTY_BATCH_RESPONSE });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEnsureAnonymousSession).toHaveBeenCalled();
    const bundle = mockPost.mock.calls[0][1] as Bundle;
    const urls = bundle.entry?.map(e => e.request?.url) ?? [];
    expect(urls[2]).toContain(
      encodeURIComponent('https://login.konsulin.care/guestid|GUEST-UUID')
    );
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

  it('parses nested searchsets and dedupes responses across author and identifier queries', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const responseResource = {
      resourceType: 'QuestionnaireResponse',
      id: 'QR-1',
      questionnaire: 'Questionnaire/phq2',
      status: 'completed',
      authored: '2026-08-10T00:00:00Z'
    };
    const mockPost = vi.fn().mockResolvedValue({
      data: {
        resourceType: 'Bundle',
        type: 'batch-response',
        entry: [
          {
            resource: {
              resourceType: 'Bundle',
              type: 'searchset',
              entry: [
                {
                  resource: {
                    resourceType: 'ResearchStudy',
                    id: 'study-a',
                    status: 'active',
                    protocol: [{ reference: 'PlanDefinition/batch-1' }]
                  }
                },
                {
                  resource: {
                    resourceType: 'PlanDefinition',
                    id: 'batch-1',
                    status: 'active',
                    effectivePeriod: {
                      start: '2026-08-01',
                      end: '2026-08-31'
                    },
                    action: [
                      { definitionCanonical: 'Questionnaire/phq2' },
                      {
                        definitionCanonical: 'Questionnaire/big-five-inventory'
                      }
                    ]
                  }
                }
              ]
            },
            response: { status: '200' }
          },
          {
            resource: {
              resourceType: 'Bundle',
              type: 'searchset',
              entry: [{ resource: responseResource }]
            },
            response: { status: '200' }
          },
          {
            resource: {
              resourceType: 'Bundle',
              type: 'searchset',
              entry: [{ resource: responseResource }]
            },
            response: { status: '200' }
          }
        ]
      }
    });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as AxiosInstance);

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.cumulativeResponses).toBe(1);
    expect(result.current.data?.studies[0].completedCount).toBe(1);
    expect(result.current.data?.currentLevel?.label).toBe('Participant');
  });
});

describe('useConsentToStudy', () => {
  it('posts a consent transaction bundle for the patient and study', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    mockSubmitFhirBundle.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: []
    });

    const { result } = renderHook(() => useConsentToStudy('study-a'), {
      wrapper: createWrapper()
    });

    await result.current.mutateAsync();

    expect(mockSubmitFhirBundle).toHaveBeenCalledTimes(1);
    const bundle = mockSubmitFhirBundle.mock.calls[0][0];
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry?.[0]).toMatchObject({
      request: { method: 'POST', url: 'Consent' },
      resource: { patient: { reference: 'Patient/PAT-1' } }
    });
    expect(bundle.entry?.[1]).toMatchObject({
      request: { method: 'POST', url: 'ResearchSubject' },
      resource: { study: { reference: 'ResearchStudy/study-a' } }
    });
  });
});
