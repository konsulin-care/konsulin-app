import { act, renderHook } from '@testing-library/react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type Mock
} from 'vitest';

import { useProfileSave } from '@/app/profile/hooks/useProfileSave';

import type { ICustomProfile } from '@/app/profile/edit-profile';

// ---------------------------------------------------------------------------
// Module-level mocks
// ---------------------------------------------------------------------------

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn(),
  modifyProfile: vi.fn()
}));

vi.mock('@/utils/helper', () => ({
  findIdentifierValue: vi.fn(),
  mergeNames: vi.fn()
}));

vi.mock('@/utils/profileCompleteness', () => ({
  isProfileCompleteFromFHIR: vi.fn()
}));

vi.mock('@/utils/validation', () => ({
  validateEmail: vi.fn()
}));

vi.mock('react-toastify', () => ({
  toast: { error: vi.fn() }
}));

vi.mock('@/lib/indexeddb', () => ({
  dbSet: vi.fn(),
  STORES: { userProfile: 'user_profile' }
}));

vi.mock('supertokens-auth-react/recipe/session', () => ({
  getClaimValue: vi.fn()
}));

vi.mock('supertokens-web-js/recipe/userroles', () => ({
  UserRoleClaim: {}
}));

// ---------------------------------------------------------------------------
// Import mocked modules
// ---------------------------------------------------------------------------

import { getProfileById, modifyProfile } from '@/services/profile';
import { findIdentifierValue, mergeNames } from '@/utils/helper';
import { isProfileCompleteFromFHIR } from '@/utils/profileCompleteness';
import { getClaimValue } from 'supertokens-auth-react/recipe/session';

const BASE_PROFILE: ICustomProfile = {
  fhirId: '',
  resourceType: null,
  active: false,
  birthDate: '',
  gender: 'unknown',
  photo: '',
  userId: '',
  firstName: '',
  lastName: '',
  addresses: [],
  cityCode: '',
  city: '',
  district: '',
  districtCode: '',
  provinceCode: '',
  province: '',
  postalCode: '',
  phone: '',
  email: ''
};

/** Renders useProfileSave with a successful FHIR update and captured invalidation. */
function renderSuccessfulSave(
  invalidateQueries: Mock<(args: unknown) => void>
) {
  const mockUpdateProfile = vi.fn().mockResolvedValue({
    id: 'patient-1',
    resourceType: 'Patient'
  });

  const { result } = renderHook(() =>
    useProfileSave({
      updateUser: {
        ...BASE_PROFILE,
        firstName: 'John',
        lastName: 'Doe',
        fhirId: 'patient-1',
        userId: 'user-1',
        phone: '+628123456789'
      },
      fhirId: 'patient-1',
      fhirRole: 'Patient',
      authState: {
        userInfo: {
          userId: 'user-1',
          role_name: 'Patient',
          email: 'john@example.com',
          fhirId: 'patient-1'
        }
      },
      resolvePhotoUrl: vi.fn().mockResolvedValue(''),
      isValidUrl: vi.fn().mockReturnValue(true),
      updateProfile: mockUpdateProfile,
      clearDraft: vi.fn(),
      dispatchAuth: vi.fn(),
      queryClient: { invalidateQueries },
      setDrawerState: vi.fn()
    })
  );

  return result;
}

describe('useProfileSave role-profile invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(getProfileById).mockResolvedValue({
      id: 'patient-1',
      resourceType: 'Patient',
      name: [{ use: 'official', given: ['Old'], family: 'Name' }],
      identifier: [
        { system: 'https://login.konsulin.care/userid', value: 'user-1' },
        { system: 'https://login.konsulin.care/chatwoot-id', value: 'cw-123' }
      ],
      photo: [{ url: 'https://example.com/old-photo.jpg' }]
    });

    vi.mocked(modifyProfile).mockResolvedValue({ chatwootId: 'cw-123' });
    vi.mocked(findIdentifierValue).mockReturnValue('cw-123');
    vi.mocked(mergeNames).mockReturnValue('John Doe');
    vi.mocked(isProfileCompleteFromFHIR).mockReturnValue(true);
    vi.mocked(getClaimValue).mockResolvedValue(['Patient']);

    // Mock fetch for CSRF token endpoint + auth cookie POST endpoint
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({ token: 'csrf-123' }, { status: 200 })
        )
        .mockResolvedValueOnce(new Response('ok', { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('invalidates role-profile queries after a successful save', async () => {
    const invalidateQueries = vi.fn();

    const result = renderSuccessfulSave(invalidateQueries);

    await act(async () => {
      await result.current.handleEditSave();
    });

    // The dropdown profile cache must be invalidated so the next role
    // switch shows the just-updated photo without a manual refresh.
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['role-profiles']
    });
  });

  it('does not invalidate role-profile queries when the save fails', async () => {
    const invalidateQueries = vi.fn();

    const result = renderSuccessfulSave(invalidateQueries);
    vi.mocked(getProfileById).mockRejectedValueOnce(new Error('fetch failed'));

    await act(async () => {
      await result.current.handleEditSave();
    });

    expect(invalidateQueries).not.toHaveBeenCalledWith({
      queryKey: ['role-profiles']
    });
  });
});
