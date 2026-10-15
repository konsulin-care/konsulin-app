import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAuth } from '@/__tests__/react-test-utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockLocale, mockToastError } = vi.hoisted(() => ({
  mockLocale: { current: 'id' },
  mockToastError: vi.fn()
}));

vi.mock('@/i18n', () => ({
  useTranslations: vi.fn(() => (key: string) => {
    const locale = mockLocale.current;
    const translations: Record<string, string> = {
      personal_info: 'Personal Information',
      contact: 'Contact',
      address: 'Address',
      gender: 'Gender',
      birth_date: 'Date of Birth',
      language: 'Language',
      email: 'Email',
      phone: 'Phone',
      line: 'Line',
      district: 'District',
      city: 'City',
      province: 'Province',
      postal_code: 'Postal Code',
      incomplete: 'Your profile is incomplete.',
      incomplete_desc:
        'Please update your information to complete registration.',
      dismiss: 'Dismiss',
      update_photo: 'Update Photo',
      profile_photo: 'Profile photo',
      professional: 'Professional',
      additional: 'Additional',
      delete_account: 'Delete Account',
      log_out: 'Log out',
      edit_name: locale === 'id' ? 'Ubah nama' : 'Edit name',
      select_option: locale === 'id' ? 'Pilih opsi' : 'Select option',
      photo_update_failed:
        locale === 'id'
          ? 'Gagal memperbarui foto profil'
          : 'Failed to update profile photo'
    };
    return translations[key] ?? key;
  })
}));

vi.mock('react-toastify', () => ({
  toast: { error: mockToastError, success: vi.fn() }
}));

vi.mock('@/services/profile', () => ({
  uploadAvatar: vi.fn()
}));

vi.mock('@/utils/image-processing', () => ({
  processImageForAvatar: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

const mockRouterPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useSearchParams: () => ({ get: vi.fn() }),
  usePathname: () => '/profile'
}));

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header' />
}));

vi.mock('@/components/profile/ProfileActions', () => ({
  default: () => <div data-testid='profile-actions' />
}));

vi.mock('../extension-card', () => ({
  default: ({ profile }: { profile: { resourceType: string } }) => (
    <div data-testid='extension-card'>
      {profile.resourceType === 'Practitioner' ? 'Professional' : 'Additional'}
    </div>
  )
}));

vi.mock('../hooks/useProfileData', () => ({
  useProfileData: vi.fn()
}));

vi.mock('../hooks/useProfilePhotoSave', () => ({
  useProfilePhotoSave: vi.fn()
}));

vi.mock('../name-edit-drawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid='name-drawer' /> : null
}));
vi.mock('../personal-info-edit-drawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid='personal-info-drawer' /> : null
}));
vi.mock('../contact-edit-drawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid='contact-drawer' /> : null
}));
vi.mock('../address-edit-drawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid='address-drawer' /> : null
}));

vi.mock('next/image', async () => {
  const { createNextImageMock } = await import('@/__tests__/mocks/next-image');
  return createNextImageMock();
});

import CompletenessBanner from '@/components/profile/completeness-banner';
import DropdownProfile from '@/components/profile/dropdown-profile';
import { useAuth } from '@/context/auth/authContext';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { uploadAvatar } from '@/services/profile';
import type { RoleProfile } from '@/services/role-profiles';
import type { Patient } from 'fhir/r4';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { useProfileData } from '../hooks/useProfileData';
import { useProfilePhotoSave } from '../hooks/useProfilePhotoSave';
import ProfileDisplay from '../profile-display';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const sections = [
  {
    id: 'personal-info',
    title: 'Personal Information',
    rows: [{ id: 'gender', key: 'Gender', value: 'Male' }]
  },
  {
    id: 'contact',
    title: 'Contact',
    rows: [{ id: 'email', key: 'Email', value: 'john@konsulin.care' }]
  },
  {
    id: 'address',
    title: 'Address',
    rows: [{ id: 'city', key: 'City', value: 'Jakarta Selatan' }]
  }
];

const identity = {
  photoUrl: undefined,
  initials: 'JD',
  backgroundColor: '#13c2c2',
  seed: 'seed-1',
  displayName: 'John Magnificent Doe',
  given: ['John', 'Magnificent'],
  family: 'Doe'
};

type MockRoleProfile = RoleProfile;

const ROLE_RESOURCE_TYPE: Record<string, 'Patient' | 'Practitioner'> = {
  'Clinic Admin': 'Practitioner',
  Practitioner: 'Practitioner'
};

function mockProfileHooks(
  roleName: string,
  roleProfiles?: Record<string, MockRoleProfile | null>
) {
  const resourceType = ROLE_RESOURCE_TYPE[roleName] ?? 'Patient';
  const resolved = roleProfiles ?? {
    [roleName]: {
      name: 'Test User',
      photoUrl: '',
      resource: { resourceType, id: 'res-1' }
    }
  };
  vi.mocked(useProfileData).mockReturnValue({
    profileData: resolved[roleName]?.resource,
    roleProfiles: resolved,
    identity,
    sections,
    resourceType
  });
  vi.mocked(useProfilePhotoSave).mockReturnValue({
    isUploading: false,
    handleFileSelected: vi.fn()
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocale.current = 'id';
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('useProfileCompleteness', () => {
    it('returns showBanner=true when profile_complete is false', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'p1',
        profile_complete: false
      });

      const { result } = renderHook(() => useProfileCompleteness());
      expect(result.current.showBanner).toBe(true);
      expect(result.current.isComplete).toBe(false);
    });

    it('returns showBanner=false when profile_complete is true', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'p1',
        profile_complete: true
      });

      const { result } = renderHook(() => useProfileCompleteness());
      expect(result.current.showBanner).toBe(false);
      expect(result.current.isComplete).toBe(true);
    });

    it('falls back to local FHIR check when the server flag is undefined', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'p1'
      });

      // name + gender + birthDate + language = complete
      const completeProfile: Patient = {
        resourceType: 'Patient',
        id: 'p1',
        name: [{ use: 'official', given: ['John'] }],
        gender: 'male',
        birthDate: '1990-01-01',
        communication: [{ language: { coding: [{ code: 'id' }] } }]
      };

      const { result } = renderHook(() =>
        useProfileCompleteness(completeProfile)
      );
      expect(result.current.isComplete).toBe(true);
      expect(result.current.showBanner).toBe(false);
    });

    it('detects an incomplete profile via local FHIR check', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'p1'
      });

      // missing gender and language
      const incompleteProfile: Patient = {
        resourceType: 'Patient',
        id: 'p1',
        name: [{ use: 'official', given: ['John'] }],
        birthDate: '1990-01-01'
      };

      const { result } = renderHook(() =>
        useProfileCompleteness(incompleteProfile)
      );
      expect(result.current.isComplete).toBe(false);
      expect(result.current.showBanner).toBe(true);
    });
  });

  describe('CompletenessBanner', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it('renders when show is true', () => {
      render(<CompletenessBanner show />);
      expect(screen.getByText('Your profile is incomplete.')).toBeDefined();
    });

    it('does not render when show is false', () => {
      const { container } = render(<CompletenessBanner show={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('dismisses on the dismiss button', () => {
      render(<CompletenessBanner show />);
      fireEvent.click(screen.getByLabelText('Dismiss'));
      expect(screen.queryByText('Your profile is incomplete.')).toBeNull();
    });
  });

  describe('ProfileDisplay — unified composition', () => {
    it('renders the identity hero with the active role badge', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        profile_complete: true
      });
      mockProfileHooks('Patient');

      render(<ProfileDisplay />);
      expect(screen.getByTestId('role-badge').textContent).toBe('Patient');
      expect(screen.getByTestId('display-name').textContent).toBe(
        'John Magnificent Doe'
      );
    });

    it('renders every section card from the profile data hook', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Practitioner',
        fhirId: 'pra-1',
        profile_complete: true
      });
      mockProfileHooks('Practitioner');

      render(<ProfileDisplay />);
      expect(screen.getByText('Personal Information')).toBeDefined();
      expect(screen.getByText('Contact')).toBeDefined();
      expect(screen.getByText('Address')).toBeDefined();
      expect(screen.getByTestId('extension-card')).toBeDefined();
      expect(screen.getByTestId('profile-actions')).toBeDefined();
    });

    it('opens the name drawer from the pencil in the identity hero', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        profile_complete: true
      });
      mockProfileHooks('Patient');

      render(<ProfileDisplay />);
      expect(screen.queryByTestId('name-drawer')).toBeNull();
      fireEvent.click(screen.getByTestId('edit-name'));
      expect(screen.getByTestId('name-drawer')).toBeDefined();
    });

    it('opens the matching section drawer from a card pencil', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        profile_complete: true
      });
      mockProfileHooks('Patient');

      render(<ProfileDisplay />);
      fireEvent.click(screen.getAllByTestId('section-edit')[0]);
      expect(screen.getByTestId('personal-info-drawer')).toBeDefined();
      expect(screen.queryByTestId('contact-drawer')).toBeNull();
    });

    it('renders uniformly for the Clinic Admin role', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Clinic Admin',
        fhirId: 'clinic-1',
        profile_complete: true
      });
      mockProfileHooks('Clinic Admin');

      render(<ProfileDisplay />);
      expect(screen.getByTestId('role-badge').textContent).toBe('Clinic Admin');
      expect(screen.getByText('Personal Information')).toBeDefined();
      expect(screen.getByTestId('profile-actions')).toBeDefined();
    });

    it('renders Professional AND Additional cards for every owned role', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        userId: 'u1',
        roles: ['Patient', 'Practitioner'],
        profile_complete: true
      });
      mockProfileHooks('Patient', {
        Patient: {
          name: 'John Doe',
          photoUrl: '',
          resource: { resourceType: 'Patient', id: 'pat-1' }
        },
        Practitioner: {
          name: 'Jane Smith',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'pra-1' }
        }
      });

      render(<ProfileDisplay />);
      expect(screen.getAllByTestId('extension-card')).toHaveLength(2);
      expect(screen.getByText('Professional')).toBeDefined();
      expect(screen.getByText('Additional')).toBeDefined();
    });

    it('renders unique keys when two roles share the same resource ID', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Practitioner',
        fhirId: 'DG5CY3QAKEOXE2Y6',
        userId: 'u1',
        roles: ['Practitioner', 'Clinic Admin'],
        profile_complete: true
      });
      // Both roles resolve to the same Practitioner resource
      mockProfileHooks('Practitioner', {
        Practitioner: {
          name: 'John Doe',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'DG5CY3QAKEOXE2Y6' }
        },
        'Clinic Admin': {
          name: 'John Doe',
          photoUrl: '',
          resource: { resourceType: 'Practitioner', id: 'DG5CY3QAKEOXE2Y6' }
        }
      });

      const consoleSpy = vi
        .spyOn(console, 'error')
        // skipcq: JS-0321 — intentional: suppress console noise in test
        .mockImplementation(() => {});
      render(<ProfileDisplay />);
      // Two cards should render (one per role)
      expect(screen.getAllByTestId('extension-card')).toHaveLength(2);
      // No duplicate key warning should have been emitted
      const duplicateKeyCall = consoleSpy.mock.calls.find(
        ([msg]) => typeof msg === 'string' && msg.includes('same key')
      );
      expect(duplicateKeyCall).toBeUndefined();
      consoleSpy.mockRestore();
    });
  });

  describe('Profile strings per locale', () => {
    /** Render the composed page with a fixed Patient auth state. */
    function renderProfilePage() {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        profile_complete: true
      });
      mockProfileHooks('Patient');
      render(<ProfileDisplay />);
    }

    it('shows the edit-name aria-label in Indonesian under id', () => {
      mockLocale.current = 'id';
      renderProfilePage();
      expect(screen.getByTestId('edit-name')).toHaveAttribute(
        'aria-label',
        'Ubah nama'
      );
    });

    it('shows the edit-name aria-label in English under en', () => {
      mockLocale.current = 'en';
      renderProfilePage();
      expect(screen.getByTestId('edit-name')).toHaveAttribute(
        'aria-label',
        'Edit name'
      );
    });

    it('shows the select option placeholder in Indonesian under id', () => {
      mockLocale.current = 'id';
      render(
        <DropdownProfile
          options={[]}
          value=''
          placeholder=''
          labelPlaceholder=''
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText('Pilih opsi')).toBeDefined();
    });

    it('shows the select option placeholder in English under en', () => {
      mockLocale.current = 'en';
      render(
        <DropdownProfile
          options={[]}
          value=''
          placeholder=''
          labelPlaceholder=''
          onSelect={vi.fn()}
        />
      );
      expect(screen.getByText('Select option')).toBeDefined();
    });

    /** Trigger a failed avatar upload and assert the shown toast text. */
    async function expectAvatarFailureToast(expected: string) {
      vi.mocked(uploadAvatar).mockRejectedValue(new Error('upload failed'));
      const consoleSpy = vi
        .spyOn(console, 'error')
        // skipcq: JS-0321 — intentional: suppress console noise in test
        .mockImplementation(() => {});
      const { result } = renderHook(() =>
        useAvatarUpload({
          photo: 'data:image/png;base64,AAAA',
          fhirId: 'fhir-1',
          setIsUploadingPhoto: vi.fn()
        })
      );
      const url = await result.current.resolvePhotoUrl('', 'cw-1', () => false);
      expect(url).toBe('');
      expect(mockToastError).toHaveBeenCalledWith(expected);
      consoleSpy.mockRestore();
    }

    it('shows the avatar failure toast in Indonesian under id', async () => {
      mockLocale.current = 'id';
      await expectAvatarFailureToast('Gagal memperbarui foto profil');
    });

    it('shows the avatar failure toast in English under en', async () => {
      mockLocale.current = 'en';
      await expectAvatarFailureToast('Failed to update profile photo');
    });
  });
});
