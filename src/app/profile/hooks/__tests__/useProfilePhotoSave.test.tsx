import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { Patient, Person, Practitioner } from 'fhir/r4';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn(),
  modifyProfile: vi.fn(),
  uploadAvatar: vi.fn(),
  useUpdateProfile: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/utils/image-processing', () => ({
  processImageForAvatar: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { success: vi.fn(), error: vi.fn() }
}));

import { useAuth } from '@/context/auth/authContext';
import type { IActionLogin } from '@/context/auth/authTypes';
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

const personFixture: Person = {
  resourceType: 'Person',
  id: 'clinic-1',
  active: true,
  name: [{ use: 'official', given: ['Alex'], family: 'Brown' }],
  identifier: [{ system: CHATWOOT_SYSTEM, value: 'cw-456' }]
};

describe('useProfilePhotoSave', () => {
  let queryClient: QueryClient;
  const mockUpdate = vi.fn();
  const mockDispatch = vi.fn();
  const mockFile = new File(['image-bytes'], 'avatar.png', {
    type: 'image/png'
  });

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
          role_name: 'Patient',
          fullname: 'John Doe',
          fhirId: 'pat-1',
          profile_picture: '',
          roleProfiles: {}
        }
      }
    });
    vi.mocked(useUpdateProfile).mockReturnValue({
      mutateAsync: mockUpdate
    } as unknown as ReturnType<typeof useUpdateProfile>);
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

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('uploads the file and PUTs the photo array for Patient', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);
    queryClient.setQueryData(['profile-data', 'pat-1'], patientFixture);

    const { result } = renderHook(
      () =>
        useProfilePhotoSave({
          fhirId: 'pat-1',
          resourceType: 'Patient',
          profile: patientFixture
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(uploadAvatar).toHaveBeenCalledWith('cw-123', expect.any(Blob));
    expect(mockUpdate).toHaveBeenCalledWith({
      payload: {
        ...patientFixture,
        photo: [{ url: 'https://cdn.example.com/avatar.jpg' }]
      }
    });
  });

  it('PUTs a single Attachment photo for Person', async () => {
    vi.mocked(getProfileById).mockResolvedValue(personFixture);

    const { result } = renderHook(
      () =>
        useProfilePhotoSave({
          fhirId: 'clinic-1',
          resourceType: 'Person',
          profile: personFixture
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(mockUpdate).toHaveBeenCalledWith({
      payload: {
        ...personFixture,
        photo: { url: 'https://cdn.example.com/avatar.jpg' }
      }
    });
  });

  it('dispatches an optimistic auth-check with the new photo for the active role', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);

    const { result } = renderHook(
      () =>
        useProfilePhotoSave({
          fhirId: 'pat-1',
          resourceType: 'Patient',
          profile: patientFixture
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    const action = mockDispatch.mock.calls[0]?.[0] as IActionLogin;
    expect(action.type).toBe('auth-check');
    expect(action.payload?.profile_picture).toBe(
      'https://cdn.example.com/avatar.jpg'
    );
    expect(action.payload?.roleProfiles?.Patient).toEqual({
      name: 'John Doe',
      photoUrl: 'https://cdn.example.com/avatar.jpg'
    });
  });

  it('invalidates the profile-data cache only (no role-profiles refetch)', async () => {
    vi.mocked(getProfileById).mockResolvedValue(patientFixture);
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(
      () =>
        useProfilePhotoSave({
          fhirId: 'pat-1',
          resourceType: 'Patient',
          profile: patientFixture
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['profile-data', 'pat-1']
    });
    expect(invalidateSpy).not.toHaveBeenCalledWith({
      queryKey: ['role-profiles']
    });
  });

  it('falls back to modifyProfile when chatwoot id is missing', async () => {
    const noChatwoot: Person = {
      ...personFixture,
      identifier: []
    };
    vi.mocked(getProfileById).mockResolvedValue(noChatwoot);
    vi.mocked(modifyProfile).mockResolvedValue({
      chatwootId: 'cw-new'
    });

    const { result } = renderHook(
      () =>
        useProfilePhotoSave({
          fhirId: 'clinic-1',
          resourceType: 'Person',
          profile: noChatwoot,
          fallbackName: 'Alex Brown'
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(modifyProfile).toHaveBeenCalledWith({
      name: 'Alex Brown',
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
    vi.mocked(getProfileById).mockResolvedValue(noChatwoot);
    vi.mocked(modifyProfile).mockRejectedValue(new Error('missing name'));

    const { result } = renderHook(
      () =>
        useProfilePhotoSave({
          fhirId: 'pra-1',
          resourceType: 'Practitioner',
          profile: noChatwoot
        }),
      { wrapper }
    );

    await act(async () => {
      await result.current.handleFileSelected(mockFile);
    });

    expect(uploadAvatar).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    await waitFor(() => expect(result.current.isUploading).toBe(false));
  });
});
