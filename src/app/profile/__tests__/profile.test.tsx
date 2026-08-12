import { fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mockAuth } from '@/__tests__/test-utils';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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
  default: () => <div data-testid='extension-card' />
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
import { useAuth } from '@/context/auth/authContext';
import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import type { Patient } from 'fhir/r4';
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

function mockProfileHooks(roleName: string) {
  vi.mocked(useProfileData).mockReturnValue({
    profileData: { resourceType: 'Patient', id: 'pat-1' },
    isLoading: false,
    identity,
    sections,
    resourceType: roleName === 'Clinic Admin' ? 'Person' : 'Patient'
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

    it('renders uniformly for a Person-based role (Clinic Admin)', () => {
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
  });
});
