import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { HumanName, Patient } from 'fhir/r4';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn(),
  modifyProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  useUpdateProfile: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  getClaimValue: vi.fn()
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: 'user-role'
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { userProfile: 'user_profile' },
  dbSet: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

import { useAuth } from '@/context/auth/authContext';
import type { IActionLogin } from '@/context/auth/authTypes';
import { dbSet } from '@/lib/indexeddb';
import {
  getProfileById,
  modifyProfile,
  useUpdateProfile
} from '@/services/profile';
import { useProfileSectionSave } from '../useProfileSectionSave';

const originalFetch = globalThis.fetch;

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['Old'], family: 'Name' }]
};

describe('useProfileSectionSave', () => {
  let queryClient: QueryClient;
  const mockUpdate = vi.fn();
  const mockDispatch = vi.fn();

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      dispatch: mockDispatch,
      state: {
        isAuthenticated: true,
        userInfo: {
          userId: 'u1',
          email: 'user@konsulin.care',
          role_name: 'Patient',
          fhirId: 'pat-1'
        }
      }
    });
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: mockUpdate
    } as unknown as ReturnType<typeof useUpdateProfile>);
    mockUpdate.mockResolvedValue(patientFixture);
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (url.includes('csrf-token')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ token: 'csrf-123' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('merges section fields into the latest resource and PUTs it whole', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);

    const { result } = renderHook(() => useProfileSectionSave(), { wrapper });

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => ({ ...latest, gender: 'female' as const })
      });
    });

    expect(getProfileById).toHaveBeenCalledWith('pat-1', 'Patient');
    expect(mockUpdate).toHaveBeenCalledWith({
      payload: { ...patientFixture, gender: 'female' }
    });
  });

  it('invalidates the profile-data and role-profiles caches', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useProfileSectionSave(), { wrapper });

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => latest
      });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['profile-data', 'pat-1']
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['role-profiles']
    });
  });

  it('runs the identity sync (Chatwoot + auth cookie) when flagged', async () => {
    const mergedName: HumanName = {
      use: 'official',
      given: ['John', 'Magnificent'],
      family: 'Doe'
    };
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);
    mockUpdate.mockResolvedValue({ ...patientFixture, name: [mergedName] });
    vi.mocked(modifyProfile).mockResolvedValue({ chatwootId: 'cw-1' });

    const { result } = renderHook(() => useProfileSectionSave(), { wrapper });

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        syncIdentity: true,
        merge: latest => ({ ...latest, name: [mergedName] })
      });
    });

    expect(modifyProfile).toHaveBeenCalledWith({
      name: 'John Magnificent Doe',
      email: 'user@konsulin.care',
      phoneNumber: undefined
    });
    const action = mockDispatch.mock.calls[0]?.[0] as IActionLogin;
    expect(action.type).toBe('auth-check');
    expect(action.payload?.fullname).toBe('John Magnificent Doe');
    expect(action.payload?.fhirId).toBe('pat-1');
    expect(dbSet).toHaveBeenCalled();
  });

  it('skips the identity sync when not flagged', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);

    const { result } = renderHook(() => useProfileSectionSave(), { wrapper });

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => latest
      });
    });

    expect(modifyProfile).not.toHaveBeenCalled();
  });

  it('calls onSuccess and shows a toast after saving', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);
    const onSuccess = vi.fn();

    const { result } = renderHook(() => useProfileSectionSave(), { wrapper });

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => latest,
        onSuccess
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
