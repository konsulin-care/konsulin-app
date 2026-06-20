/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createQueryClient, mockAuth } from '@/__tests__/test-utils';

// ---------------------------------------------------------------------------
// Mock dependencies
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

vi.mock('@/lib/indexeddb', () => ({
  STORES: { profileEditDrafts: 'profile_edit_drafts' },
  dbGet: vi.fn(),
  dbSet: vi.fn(),
  dbDelete: vi.fn()
}));

// Mock child components to isolate ProfileDisplay behavior
vi.mock('../patient', () => ({
  default: ({ fhirId }: { fhirId: string }) => (
    <div data-testid='patient-profile'>Patient {fhirId}</div>
  )
}));

vi.mock('../clinician', () => ({
  default: ({ fhirId }: { fhirId: string }) => (
    <div data-testid='clinician-profile'>Clinician {fhirId}</div>
  )
}));

import { useAuth } from '@/context/auth/authContext';

// ---------------------------------------------------------------------------
// Profile page — all tests share one QueryClient and wrapper
// ---------------------------------------------------------------------------

import { useProfileCompleteness } from '@/hooks/useProfileCompleteness';
import { Patient } from 'fhir/r4';

import { usePractitionerProfile } from '@/hooks/usePractitionerProfile';

vi.mock('@/services/profile', () => ({
  getProfileById: vi.fn()
}));

import { getProfileById } from '@/services/profile';

import CompletenessBanner from '@/components/profile/completeness-banner';
import ProfileDisplay from '../profile-display';

describe('Profile page', () => {
  let queryClient: ReturnType<typeof createQueryClient>;

  beforeEach(() => {
    queryClient = createQueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  // -----------------------------------------------------------------------
  // useProfileCompleteness
  // -----------------------------------------------------------------------
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

    it('falls back to local FHIR check when server flag is undefined', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'p1'
      });

      // A profile with name + birthDate + phone telecom = complete
      const completeProfile = {
        resourceType: 'Patient',
        id: 'p1',
        name: [{ use: 'official', given: ['John'] }],
        birthDate: '1990-01-01',
        telecom: [{ system: 'phone', value: '+628123456789' }]
      } as Patient;

      const { result } = renderHook(() =>
        useProfileCompleteness(completeProfile)
      );
      expect(result.current.isComplete).toBe(true);
      expect(result.current.showBanner).toBe(false);
    });

    it('detects incomplete profile via local FHIR check', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'p1'
      });

      // A profile missing name and birthDate
      const incompleteProfile = {
        resourceType: 'Patient',
        id: 'p1',
        telecom: []
      } as Patient;

      const { result } = renderHook(() =>
        useProfileCompleteness(incompleteProfile)
      );
      expect(result.current.isComplete).toBe(false);
      expect(result.current.showBanner).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // usePractitionerProfile
  // -----------------------------------------------------------------------
  describe('usePractitionerProfile', () => {
    it('fetches practitioner profile by FHIR ID', () => {
      vi.mocked(getProfileById).mockResolvedValue({
        id: 'p1',
        resourceType: 'Practitioner'
      } as any);

      const { result } = renderHook(() => usePractitionerProfile('p1'), {
        wrapper
      });

      expect(result.current.isLoading).toBe(true);
      expect(getProfileById).toHaveBeenCalledWith('p1', 'Practitioner');
    });

    it('is not enabled when fhirId is empty', () => {
      vi.mocked(getProfileById).mockResolvedValue({} as any);

      const { result } = renderHook(() => usePractitionerProfile(''), {
        wrapper
      });

      // When enabled is false, React Query v4 still reports isLoading=true initially
      // but the queryFn is never called
      expect(getProfileById).not.toHaveBeenCalled();
      expect(result.current.fetchStatus).toBe('idle');
    });
  });

  // -----------------------------------------------------------------------
  // CompletenessBanner
  // -----------------------------------------------------------------------
  describe('CompletenessBanner', () => {
    beforeEach(() => {
      sessionStorage.clear();
    });

    it('renders when show is true', () => {
      render(<CompletenessBanner show />);
      expect(screen.getByText('Your profile is incomplete.')).toBeDefined();
      expect(screen.getByText('Edit Profile')).toBeDefined();
    });

    it('does not render when show is false', () => {
      const { container } = render(<CompletenessBanner show={false} />);
      expect(container.firstChild).toBeNull();
    });

    it('navigates to edit profile on button click', () => {
      render(<CompletenessBanner show />);
      const button = screen.getByText('Edit Profile');
      button.click();
      expect(mockRouterPush).toHaveBeenCalledWith('/profile?path=edit-profile');
    });
  });

  // -----------------------------------------------------------------------
  // ProfileDisplay — role dispatch
  // -----------------------------------------------------------------------
  describe('ProfileDisplay', () => {
    it('renders Patient profile when role is Patient', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        profile_complete: true
      });

      render(<ProfileDisplay />, { wrapper });
      expect(screen.getByTestId('patient-profile')).toBeDefined();
      expect(screen.queryByTestId('clinician-profile')).toBeNull();
    });

    it('renders Clinician profile when role is Practitioner', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Practitioner',
        fhirId: 'pra-1',
        profile_complete: true
      });

      render(<ProfileDisplay />, { wrapper });
      expect(screen.getByTestId('clinician-profile')).toBeDefined();
      expect(screen.queryByTestId('patient-profile')).toBeNull();
    });

    it('shows completeness banner when profile_complete is false', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        profile_complete: false
      });

      render(<ProfileDisplay />, { wrapper });
      expect(screen.getByText('Your profile is incomplete.')).toBeDefined();
    });

    it('hides completeness banner when profile_complete is true', () => {
      mockAuth(vi.mocked(useAuth), {
        role_name: 'Patient',
        fhirId: 'pat-1',
        profile_complete: true
      });

      render(<ProfileDisplay />, { wrapper });
      expect(screen.queryByText('Your profile is incomplete.')).toBeNull();
    });
  });
});
