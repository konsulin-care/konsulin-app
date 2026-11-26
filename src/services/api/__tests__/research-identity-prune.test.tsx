import { EMPTY_BATCH_RESPONSE } from '@/__tests__/fixtures/research-api-mocks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

const PATIENT_STATE = {
  isLoading: false,
  state: {
    isAuthenticated: true,
    userInfo: { fhirId: 'PAT-1', role_name: 'Patient' }
  }
};

const GUEST_KEY = ['research', 'guest', 'GUEST-UUID', 'structure'] as const;
const PATIENT_KEY = ['research', 'patient', 'PAT-1', 'structure'] as const;

function makeWrapper(queryClient: QueryClient) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPI).mockResolvedValue({
    get: vi.fn().mockResolvedValue({ data: EMPTY_BATCH_RESPONSE })
  } as unknown as AxiosInstance);
});

describe('useResearchIdentity cache pruning', () => {
  it('removes cached progress for the previous guest identity', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(GUEST_KEY, { marker: 'guest' });
    queryClient.setQueryData(PATIENT_KEY, { marker: 'patient' });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() =>
      expect(queryClient.getQueryData(GUEST_KEY)).toBeUndefined()
    );
    expect(queryClient.getQueryData(PATIENT_KEY)).toEqual({
      marker: 'patient'
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('keeps cached progress for the current identity', async () => {
    mockUseAuth.mockReturnValue(PATIENT_STATE);
    const queryClient = makeQueryClient();
    queryClient.setQueryData(PATIENT_KEY, { marker: 'patient' });

    const { result } = renderHook(() => useResearchProgress(), {
      wrapper: makeWrapper(queryClient)
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(queryClient.getQueryData(PATIENT_KEY)).toEqual({
      marker: 'patient'
    });
  });
});
