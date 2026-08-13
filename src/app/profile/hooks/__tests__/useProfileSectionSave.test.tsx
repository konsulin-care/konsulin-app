/* eslint-disable max-lines */
import { renderHook } from '@testing-library/react';
import type { Bundle, HumanName, Patient, Practitioner } from 'fhir/r4';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn(),
  modifyProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  useUpdateProfile: vi.fn()
}));

vi.mock('@/services/api/fhir-bundle', () => ({
  submitFhirBundle: vi.fn()
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

vi.mock('@/utils/profileCompleteness', () => ({
  isProfileCompleteFromFHIR: vi.fn(() => true)
}));

import { useAuth } from '@/context/auth/authContext';
import type { IActionLogin, IStateUserInfo } from '@/context/auth/authTypes';
import { dbSet } from '@/lib/indexeddb';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import {
  getProfileById,
  modifyProfile,
  useUpdateProfile
} from '@/services/profile';
import { toast } from 'react-toastify';
import { useProfileSectionSave } from '../useProfileSectionSave';

const originalFetch = globalThis.fetch;

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['Old'], family: 'Name' }]
};

const practitionerFixture: Practitioner = {
  resourceType: 'Practitioner',
  id: 'prac-1',
  active: true,
  name: [{ use: 'official', given: ['Old'], family: 'Name' }],
  qualification: [
    {
      code: { coding: [{ display: 'Specialist' }] },
      identifier: [{ value: 'LIC-1' }]
    }
  ]
};

const okTransactionResponse = (): Bundle => ({
  resourceType: 'Bundle',
  type: 'transaction-response',
  entry: [
    { response: { status: '200 OK' } },
    { response: { status: '200 OK' } }
  ]
});

describe('useProfileSectionSave', () => {
  const mockUpdate = vi.fn();
  const mockDispatch = vi.fn();
  const mockSubmit = submitFhirBundle as ReturnType<typeof vi.fn>;

  function setupAuth(userInfo: Partial<IStateUserInfo>) {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      dispatch: mockDispatch,
      refreshProfiles: vi.fn(),
      state: {
        isAuthenticated: true,
        userInfo: {
          userId: 'u1',
          email: 'user@konsulin.care',
          role_name: 'Patient',
          roles: ['Patient'],
          roleProfiles: {
            Patient: {
              name: 'Old Name',
              photoUrl: '',
              resource: patientFixture
            }
          },
          cachedAt: Date.now(),
          ...userInfo
        }
      }
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    setupAuth({});
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: mockUpdate
    } as unknown as ReturnType<typeof useUpdateProfile>);
    mockUpdate.mockResolvedValue(patientFixture);
    mockSubmit.mockResolvedValue(okTransactionResponse());
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

  it('merges section fields into the cached resource and PUTs it whole (single role)', async () => {
    const { result } = renderHook(() => useProfileSectionSave());

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => ({ ...latest, gender: 'female' as const })
      });
    });

    expect(getProfileById).not.toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalledWith({
      payload: { ...patientFixture, gender: 'female' }
    });
    expect(mockSubmit).not.toHaveBeenCalled();

    const action = mockDispatch.mock.calls[0]?.[0] as IActionLogin;
    expect(action.type).toBe('auth-check');
    expect(action.payload?.roleProfiles?.Patient?.resource).toMatchObject({
      gender: 'female'
    });
    expect(action.payload?.cachedAt).toEqual(expect.any(Number));
    expect(dbSet).toHaveBeenCalledWith('user_profile', expect.any(Object));
  });

  it('submits ONE transaction bundle with all role PUTs and zero GETs (multi role)', async () => {
    setupAuth({
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      roleProfiles: {
        Patient: {
          name: 'Old Name',
          photoUrl: '',
          resource: patientFixture
        },
        Practitioner: {
          name: 'Old Name',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });

    const { result } = renderHook(() => useProfileSectionSave());

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => ({ ...latest, gender: 'female' as const })
      });
    });

    expect(getProfileById).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSubmit).toHaveBeenCalledTimes(1);

    const bundle = mockSubmit.mock.calls[0]?.[0] as Bundle;
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toHaveLength(2);
    expect(bundle.entry?.[0]?.request).toEqual({
      method: 'PUT',
      url: 'Patient/pat-1'
    });
    expect(bundle.entry?.[1]?.request).toEqual({
      method: 'PUT',
      url: 'Practitioner/prac-1'
    });
    expect((bundle.entry?.[0]?.resource as Patient).gender).toBe('female');
    expect((bundle.entry?.[1]?.resource as Practitioner).gender).toBe('female');
  });

  it('applies mergeOtherRoles to other roles (language stays on the active role)', async () => {
    setupAuth({
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      roleProfiles: {
        Patient: {
          name: 'Old Name',
          photoUrl: '',
          resource: patientFixture
        },
        Practitioner: {
          name: 'Old Name',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });

    const { result } = renderHook(() => useProfileSectionSave());

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => {
          const patient = latest as Patient;
          return {
            ...patient,
            gender: 'female' as const,
            communication: [
              {
                language: {
                  coding: [
                    {
                      system: 'urn:ietf:bcp:47',
                      code: 'id',
                      display: 'Indonesian'
                    }
                  ]
                }
              }
            ]
          };
        },
        mergeOtherRoles: latest => ({ ...latest, gender: 'female' as const })
      });
    });

    const bundle = mockSubmit.mock.calls[0]?.[0] as Bundle;
    const patient = bundle.entry?.[0]?.resource as Patient;
    const practitioner = bundle.entry?.[1]?.resource as Practitioner;
    expect(patient.communication).toHaveLength(1);
    expect(practitioner.communication).toBeUndefined();
    // Practitioner qualifications are never overwritten by the sync
    expect(practitioner.qualification).toEqual(
      practitionerFixture.qualification
    );
  });

  it('recaches both merged resources in the auth dispatch', async () => {
    setupAuth({
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      roleProfiles: {
        Patient: {
          name: 'Old Name',
          photoUrl: '',
          resource: patientFixture
        },
        Practitioner: {
          name: 'Old Name',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });

    const { result } = renderHook(() => useProfileSectionSave());

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => ({ ...latest, gender: 'female' as const })
      });
    });

    const action = mockDispatch.mock.calls[0]?.[0] as IActionLogin;
    expect(action.payload?.roleProfiles?.Patient?.resource).toMatchObject({
      gender: 'female'
    });
    expect(action.payload?.roleProfiles?.Practitioner?.resource).toMatchObject({
      gender: 'female'
    });
    expect(action.payload?.fullProfile).toMatchObject({ gender: 'female' });
  });

  it('fails the whole save (error toast, no recache) when any transaction entry fails', async () => {
    setupAuth({
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner'],
      roleProfiles: {
        Patient: {
          name: 'Old Name',
          photoUrl: '',
          resource: patientFixture
        },
        Practitioner: {
          name: 'Old Name',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });
    mockSubmit.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: [
        { response: { status: '200 OK' } },
        { response: { status: '500 Internal Server Error' } }
      ]
    });

    const { result } = renderHook(() => useProfileSectionSave());

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => latest
      });
    });

    expect(toast.error).toHaveBeenCalled();
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('runs the identity sync with merged roleProfiles and persists cachedAt', async () => {
    const mergedName: HumanName = {
      use: 'official',
      given: ['John', 'Magnificent'],
      family: 'Doe'
    };
    mockUpdate.mockResolvedValue({ ...patientFixture, name: [mergedName] });
    vi.mocked(modifyProfile).mockResolvedValue({ chatwootId: 'cw-1' });

    const { result } = renderHook(() => useProfileSectionSave());

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
    expect(action.payload?.roleProfiles?.Patient).toMatchObject({
      name: 'John Magnificent Doe'
    });
    expect(action.payload?.roleProfiles?.Patient?.resource).toMatchObject({
      name: [mergedName]
    });
    expect(action.payload?.cachedAt).toEqual(expect.any(Number));
    expect(dbSet).toHaveBeenCalled();
  });

  it('skips the identity sync when not flagged', async () => {
    const { result } = renderHook(() => useProfileSectionSave());

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
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useProfileSectionSave());

    await act(async () => {
      await result.current.saveSection({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        merge: latest => latest,
        onSuccess
      });
    });

    expect(onSuccess).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });
});
