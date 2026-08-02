import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Bundle } from 'fhir/r4';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAPI } from '../../api';
import { buildResearchBundle, useResearchProgress } from '../research';

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
    expect(urls).toHaveLength(3);
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
  });
});

describe('useResearchProgress', () => {
  it('resolves patient identity and posts a batch bundle to /fhir', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const mockPost = vi.fn().mockResolvedValue({ data: EMPTY_BATCH_RESPONSE });
    vi.mocked(getAPI).mockResolvedValue({
      post: mockPost
    } as unknown as ReturnType<typeof getAPI>);

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
    } as unknown as ReturnType<typeof getAPI>);

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
    } as unknown as ReturnType<typeof getAPI>);

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
    } as unknown as ReturnType<typeof getAPI>);

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: createWrapper()
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.cumulativeResponses).toBe(1);
    expect(result.current.data?.studies[0].completedCount).toBe(1);
    expect(result.current.data?.currentLevel?.label).toBe('Participant');
  });
});
