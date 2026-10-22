import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { Bundle } from 'fhir/r4';
import { describe, expect, it, vi } from 'vitest';
import { buildConsentBundle, useConsentToStudy } from '../research';

const { mockUseAuth } = vi.hoisted(() => ({
  mockUseAuth: vi.fn<
    () => {
      isLoading: boolean;
      state: {
        isAuthenticated: boolean;
        userInfo: { fhirId?: string; role_name?: string };
      };
    }
  >()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
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

const PATIENT_STATE = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: { fhirId: 'PAT-1', role_name: 'Patient' }
  }
};

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
