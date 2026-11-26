import {
  EMPTY_BATCH_RESPONSE,
  makeQRSearchSet,
  makeStudiesBatchResponse
} from '@/__tests__/fixtures/research-api-mocks';
import { wrapper } from '@/__tests__/react-test-utils';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import type { Bundle } from 'fhir/r4';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

vi.mock('../research-prefetch', () => ({
  prefetchCurrentBatchQuestionnaires: vi.fn().mockResolvedValue(undefined)
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

/** Routes GETs: studies, subjects, by-id studies and QR searchsets. */
function mockApi(
  overrides: Partial<{
    studies: Bundle;
    subjects: Bundle;
    byId: Bundle;
    studiesPage2: Bundle;
  }> = {}
) {
  const mockPost = vi.fn();
  const mockGet = vi.fn((url: string) => {
    if (url.includes('ResearchSubject?'))
      return Promise.resolve({
        data: overrides.subjects ?? EMPTY_BATCH_RESPONSE
      });
    if (url.includes('page=2'))
      return Promise.resolve({
        data: overrides.studiesPage2 ?? EMPTY_BATCH_RESPONSE
      });
    if (url.includes('ResearchStudy?_id='))
      return Promise.resolve({ data: overrides.byId ?? EMPTY_BATCH_RESPONSE });
    if (url.includes('ResearchStudy?'))
      return Promise.resolve({
        data: overrides.studies ?? EMPTY_BATCH_RESPONSE
      });
    return Promise.resolve({ data: QR_SEARCHSET });
  });
  vi.mocked(getAPI).mockResolvedValue({
    post: mockPost,
    get: mockGet
  } as unknown as AxiosInstance);
  return { mockPost, mockGet };
}

/** URLs of every GET call. */
function getUrls(mockGet: ReturnType<typeof vi.fn>): string[] {
  return mockGet.mock.calls.map(call => String(call[0]));
}

/** Searchset with a next link to page 2. */
function withNext(bundle: Bundle): Bundle {
  return {
    ...bundle,
    link: [{ relation: 'next', url: '/fhir/ResearchStudy?page=2' }]
  };
}

/** Subject searchset with one on-study subject. */
function subjectFor(studyId: string): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    entry: [
      {
        resource: {
          resourceType: 'ResearchSubject',
          status: 'on-study',
          study: { reference: `ResearchStudy/${studyId}` },
          individual: { reference: 'Patient/PAT-1' }
        }
      }
    ]
  };
}

beforeEach(() => {
  // Fixtures hardcode the batch window 2026-09-01..2026-09-30; freeze the
  // clock inside it. Faking only 'Date' keeps setTimeout real for waitFor.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-15'));
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe('useResearchProgress', () => {
  it('reads the catalogue by GET then fetches patient-scoped responses', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockPost, mockGet } = mockApi({ studies: STUDIES_BATCH_RESPONSE });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockPost).not.toHaveBeenCalled();
    const urls = getUrls(mockGet);
    expect(urls.some(u => u.includes('ResearchStudy?'))).toBe(true);
    expect(
      urls.some(u => u.includes('ResearchSubject?patient=Patient/PAT-1'))
    ).toBe(true);
    const qrUrl = urls.find(u => u.includes('QuestionnaireResponse')) ?? '';
    expect(qrUrl).toContain('author=Patient/PAT-1');
    expect(qrUrl).toContain('authored=ge2026-06-01');

    expect(result.current.data?.cumulativeResponses).toBe(1);
    expect(result.current.data?.studies[0].completedCount).toBe(1);
  });

  it('includes studies from a second catalogue page', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    mockApi({
      studies: withNext(STUDIES_BATCH_RESPONSE),
      studiesPage2: makeStudiesBatchResponse([
        { id: 'study-b', periodStart: '2026-06-01' }
      ])
    });
    const { result } = renderHook(() => useResearchProgress(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const ids = result.current.data?.studies.map(s => s.study.id);
    expect(ids).toEqual(expect.arrayContaining(['study-a', 'study-b']));
  });

  it('fetches a consented study missing from the catalogue by id', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockGet } = mockApi({
      studies: STUDIES_BATCH_RESPONSE,
      subjects: subjectFor('study-closed'),
      byId: makeStudiesBatchResponse([
        { id: 'study-closed', periodStart: '2026-01-01' }
      ])
    });
    const { result } = renderHook(() => useResearchProgress(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getUrls(mockGet).some(u => u.includes('_id=study-closed'))).toBe(
      true
    );
    const ids = result.current.data?.studies.map(s => s.study.id);
    expect(ids).toContain('study-closed');
  });

  it('resolves guest identity and fetches responses by anonymous identifier', async () => {
    mockUseAuth.mockReturnValue(GUEST_STATE);
    mockEnsureAnonymousSession.mockResolvedValue('GUEST-UUID');
    const { mockGet } = mockApi({ studies: STUDIES_BATCH_RESPONSE });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockEnsureAnonymousSession).toHaveBeenCalled();

    const urls = getUrls(mockGet);
    expect(urls.some(url => url.includes('ResearchSubject?'))).toBe(false);

    const qrUrl = urls.find(u => u.includes('QuestionnaireResponse')) ?? '';
    expect(qrUrl).toContain(
      encodeURIComponent('https://login.konsulin.care/guestid|GUEST-UUID')
    );
    expect(qrUrl).toContain('authored=ge2026-06-01');
  });

  it('skips the response fetch entirely when no studies are active', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockGet } = mockApi();

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      getUrls(mockGet).some(u => u.includes('QuestionnaireResponse'))
    ).toBe(false);
    expect(result.current.data?.cumulativeResponses).toBe(0);
    expect(result.current.data?.studies).toEqual([]);
  });

  it('skips the response search entirely when skipResponseSearch is set', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const { mockGet } = mockApi({ studies: STUDIES_BATCH_RESPONSE });

    const { result } = renderHook(
      () => useResearchProgress({ skipResponseSearch: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(
      getUrls(mockGet).some(u => u.includes('QuestionnaireResponse'))
    ).toBe(false);
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
