import type { StudyProgress } from '@/utils/fhir/research';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Bundle } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useClaimLocalConsents } from '../research';

const { mockUseAuth, mockSubmitFhirBundle } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<
    () => {
      state: { isAuthenticated?: boolean; userInfo: { fhirId?: string } };
      isLoading: boolean;
    }
  >(),
  mockSubmitFhirBundle: vi.fn<(bundle: Bundle) => Promise<Bundle>>()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('@/services/api/fhir-bundle', () => ({
  submitFhirBundle: mockSubmitFhirBundle
}));

const PATIENT_STATE = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: { fhirId: 'PAT-1', role_name: 'Patient' }
  }
};

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

function makeStudyProgress(studyId: string): StudyProgress {
  return {
    study: { resourceType: 'ResearchStudy', id: studyId, status: 'active' },
    batches: [],
    currentBatch: null,
    completedCount: 0,
    totalCount: 0,
    isComplete: false,
    firstUncompletedQuestionnaireId: null,
    completedQuestionnaireIds: [],
    history: [],
    consecutiveBatches: 0
  };
}

beforeEach(() => {
  window.localStorage.clear();
  vi.clearAllMocks();
});

describe('useClaimLocalConsents', () => {
  it('creates FHIR consents for flagged studies and clears the flags', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    window.localStorage.setItem('konsulin_consent_study-a', '1');
    mockSubmitFhirBundle.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: []
    });

    renderHook(
      () => useClaimLocalConsents([makeStudyProgress('study-a')], new Set()),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockSubmitFhirBundle).toHaveBeenCalledTimes(1));
    const bundle = mockSubmitFhirBundle.mock.calls[0][0];
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry?.[0]).toMatchObject({
      resource: { patient: { reference: 'Patient/PAT-1' } }
    });
    expect(bundle.entry?.[1]).toMatchObject({
      resource: { study: { reference: 'ResearchStudy/study-a' } }
    });
    expect(window.localStorage.getItem('konsulin_consent_study-a')).toBeNull();
  });

  it('skips studies already consented in FHIR', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    window.localStorage.setItem('konsulin_consent_study-a', '1');

    renderHook(
      () =>
        useClaimLocalConsents(
          [makeStudyProgress('study-a')],
          new Set(['study-a'])
        ),
      { wrapper: createWrapper() }
    );

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mockSubmitFhirBundle).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('konsulin_consent_study-a')).toBe('1');
  });

  it('keeps the flag when consent creation fails', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    window.localStorage.setItem('konsulin_consent_study-a', '1');
    mockSubmitFhirBundle.mockRejectedValue(new Error('network'));

    renderHook(
      () => useClaimLocalConsents([makeStudyProgress('study-a')], new Set()),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockSubmitFhirBundle).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem('konsulin_consent_study-a')).toBe('1');
  });

  it('does nothing for guests without a patient identity', async () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: false, userInfo: {} }
    });
    window.localStorage.setItem('konsulin_consent_study-a', '1');

    renderHook(
      () => useClaimLocalConsents([makeStudyProgress('study-a')], new Set()),
      { wrapper: createWrapper() }
    );

    await new Promise(resolve => setTimeout(resolve, 20));
    expect(mockSubmitFhirBundle).not.toHaveBeenCalled();
  });
});
