/* eslint-disable max-lines */
import { renderHook, waitFor } from '@testing-library/react';
import type { Bundle, Patient, Practitioner } from 'fhir/r4';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('@/utils/image-processing', () => ({
  processImageForAvatar: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { userProfile: 'user_profile' },
  dbSet: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

import { useAuth } from '@/context/auth/authContext';
import type { IActionLogin, IStateUserInfo } from '@/context/auth/authTypes';
import { dbSet } from '@/lib/indexeddb';
import { submitFhirBundle } from '@/services/api/fhir-bundle';
import {
  getProfileById,
  modifyProfile,
  uploadAvatar,
  useUpdateProfile
} from '@/services/profile';
import { processImageForAvatar } from '@/utils/image-processing';
import { toast } from 'react-toastify';
import { useProfilePhotoSave } from '../useProfilePhotoSave';

const CHATWOOT_SYSTEM = 'https://login.konsulin.care/chatwoot-id';

const patientFixture: Patient = {
  resourceType: 'Patient',
  id: 'pat-1',
  active: true,
  name: [{ use: 'official', given: ['John'], family: 'Doe' }],
  identifier: [{ system: CHATWOOT_SYSTEM, value: 'cw-123' }]
};

const practitionerFixture: Practitioner = {
  resourceType: 'Practitioner',
  id: 'prac-1',
  active: true,
  name: [{ use: 'official', given: ['Jane'], family: 'Smith' }],
  identifier: [{ system: CHATWOOT_SYSTEM, value: 'cw-123' }]
};

describe('useProfilePhotoSave', () => {
  const mockUpdate = vi.fn();
  const mockDispatch = vi.fn();
  const mockSubmit = submitFhirBundle as ReturnType<typeof vi.fn>;
  const mockFile = new File(['image-bytes'], 'avatar.png', {
    type: 'image/png'
  });

  function setupAuth(userInfo: Partial<IStateUserInfo>) {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      dispatch: mockDispatch,
      refreshProfiles: vi.fn(),
      state: {
        isAuthenticated: true,
        userInfo: {
          userId: 'u1',
          role_name: 'Patient',
          fullname: 'John Doe',
          fhirId: 'pat-1',
          profile_picture: '',
          roles: ['Patient'],
          roleProfiles: {
            Patient: {
              name: 'John Doe',
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
    mockSubmit.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: [{ response: { status: '200 OK' } }]
    });
    vi.mocked(processImageForAvatar).mockResolvedValue({
      blob: new Blob(['processed'], { type: 'image/webp' }),
      dataUrl: 'data:image/webp;base64,xxx',
      width: 250,
      height: 250
    });
    vi.mocked(uploadAvatar).mockResolvedValue(
      'https://cdn.example.com/avatar.jpg'
    );
  });

  it('uploads the file and PUTs the photo array merged onto the cached Patient resource', async () => {
    const { result } = renderHook(() =>
      useProfilePhotoSave({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        profile: patientFixture
      })
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(getProfileById).not.toHaveBeenCalled();
    expect(uploadAvatar).toHaveBeenCalledWith('cw-123', expect.any(Blob));
    expect(mockUpdate).toHaveBeenCalledWith({
      payload: {
        ...patientFixture,
        photo: [{ url: 'https://cdn.example.com/avatar.jpg' }]
      }
    });
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('PUTs an Attachment array photo for a single-role Clinic Admin', async () => {
    setupAuth({
      role_name: 'Clinic Admin',
      roles: ['Clinic Admin'],
      roleProfiles: {
        'Clinic Admin': {
          name: 'Jane Smith',
          photoUrl: '',
          resource: practitionerFixture
        }
      }
    });

    const { result } = renderHook(() =>
      useProfilePhotoSave({
        fhirId: 'prac-1',
        resourceType: 'Practitioner',
        profile: practitionerFixture
      })
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      payload: {
        ...practitionerFixture,
        photo: [{ url: 'https://cdn.example.com/avatar.jpg' }]
      }
    });
  });

  it('writes the correct photo shape to EVERY role resource in one transaction bundle', async () => {
    setupAuth({
      role_name: 'Patient',
      roles: ['Patient', 'Practitioner', 'Clinic Admin'],
      roleProfiles: {
        Patient: {
          name: 'John Doe',
          photoUrl: '',
          resource: patientFixture
        },
        Practitioner: {
          name: 'Jane Smith',
          photoUrl: '',
          resource: practitionerFixture
        },
        'Clinic Admin': {
          name: 'Alex Brown',
          photoUrl: '',
          resource: {
            ...practitionerFixture,
            id: 'clinic-1'
          }
        }
      }
    });
    mockSubmit.mockResolvedValue({
      resourceType: 'Bundle',
      type: 'transaction-response',
      entry: [
        { response: { status: '200 OK' } },
        { response: { status: '200 OK' } },
        { response: { status: '200 OK' } }
      ]
    });

    const { result } = renderHook(() =>
      useProfilePhotoSave({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        profile: patientFixture
      })
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockSubmit).toHaveBeenCalledTimes(1);
    const bundle = mockSubmit.mock.calls[0]?.[0] as Bundle;
    expect(bundle.type).toBe('transaction');
    expect(bundle.entry).toHaveLength(3);

    const byUrl = Object.fromEntries(
      (bundle.entry ?? []).map(e => [
        (e.resource as { id?: string }).id,
        e.resource
      ])
    );
    expect(byUrl['pat-1']).toMatchObject({
      photo: [{ url: 'https://cdn.example.com/avatar.jpg' }]
    });
    expect(byUrl['prac-1']).toMatchObject({
      photo: [{ url: 'https://cdn.example.com/avatar.jpg' }]
    });
    expect(byUrl['clinic-1']).toMatchObject({
      photo: [{ url: 'https://cdn.example.com/avatar.jpg' }]
    });
  });

  it('recaches the photo into the auth dispatch and persists it', async () => {
    const { result } = renderHook(() =>
      useProfilePhotoSave({
        fhirId: 'pat-1',
        resourceType: 'Patient',
        profile: patientFixture
      })
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    const action = mockDispatch.mock.calls[0]?.[0] as IActionLogin;
    expect(action.type).toBe('auth-check');
    expect(action.payload?.profile_picture).toBe(
      'https://cdn.example.com/avatar.jpg'
    );
    expect(action.payload?.roleProfiles?.Patient?.resource).toMatchObject({
      photo: [{ url: 'https://cdn.example.com/avatar.jpg' }]
    });
    expect(action.payload?.cachedAt).toEqual(expect.any(Number));
    expect(dbSet).toHaveBeenCalledWith('user_profile', expect.any(Object));
  });

  it('falls back to modifyProfile when chatwoot id is missing', async () => {
    const noChatwoot: Practitioner = {
      ...practitionerFixture,
      identifier: []
    };
    setupAuth({
      role_name: 'Clinic Admin',
      roles: ['Clinic Admin'],
      roleProfiles: {
        'Clinic Admin': {
          name: 'Jane Smith',
          photoUrl: '',
          resource: noChatwoot
        }
      }
    });
    vi.mocked(modifyProfile).mockResolvedValue({
      chatwootId: 'cw-new'
    });

    const { result } = renderHook(() =>
      useProfilePhotoSave({
        fhirId: 'prac-1',
        resourceType: 'Practitioner',
        profile: noChatwoot,
        fallbackName: 'Jane Smith'
      })
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(modifyProfile).toHaveBeenCalledWith({
      name: 'Jane Smith',
      email: undefined,
      phoneNumber: undefined
    });
    expect(uploadAvatar).toHaveBeenCalledWith('cw-new', expect.any(Blob));
  });

  it('cancels with an error toast when no chatwoot id can be resolved', async () => {
    const noChatwoot: Practitioner = {
      resourceType: 'Practitioner',
      id: 'pra-1',
      active: true,
      name: [{ use: 'official', given: ['Jane'] }],
      identifier: []
    };
    setupAuth({
      role_name: 'Practitioner',
      roles: ['Practitioner'],
      roleProfiles: {
        Practitioner: { name: 'Jane', photoUrl: '', resource: noChatwoot }
      }
    });
    vi.mocked(modifyProfile).mockRejectedValue(new Error('missing name'));

    const { result } = renderHook(() =>
      useProfilePhotoSave({
        fhirId: 'pra-1',
        resourceType: 'Practitioner',
        profile: noChatwoot
      })
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    await waitFor(() => expect(result.current.isUploading).toBe(false));
  });
});
