/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, react/display-name, @next/next/no-img-element, jsx-a11y/alt-text */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted mocks
vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn() }),
  useSearchParams: vi.fn(),
  usePathname: vi.fn().mockReturnValue('/practitioner')
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: vi
    .fn()
    .mockReturnValue({ appointmentData: null, sessionData: null })
}));

vi.mock('@/context/booking/bookingContext', () => ({
  useBooking: vi.fn().mockReturnValue({
    state: { isBookingSubmitted: false },
    dispatch: vi.fn()
  })
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/clinic', () => ({
  usePractitionerListing: vi.fn(),
  useDetailPractitioner: vi.fn().mockReturnValue({
    newData: undefined,
    isLoading: false,
    isError: true,
    isFetching: false
  })
}));

vi.mock('@/components/general/avatar', () => ({
  default: (props: any) => <div data-testid='mock-avatar'>{props.initials}</div>
}));

vi.mock('@/components/general/empty-state', () => ({
  default: ({ title, subtitle }: any) => (
    <div data-testid='mock-empty-state'>
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: any) => (
    <svg data-testid='mock-loading-spinner' {...props} />
  )
}));

vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator }: any) => (
    <div data-testid='mock-page-header'>{pageIndicator}</div>
  )
}));

vi.mock('@/components/practitioner/practitioner-card', () => ({
  PractitionerCard: ({ practitionerName, practitionerRoleId }: any) => (
    <div data-testid='mock-practitioner-card' data-role-id={practitionerRoleId}>
      {practitionerName}
    </div>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid='mock-badge'>{children}</span>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button data-testid='mock-button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: any) => (
    <div data-testid='mock-drawer'>{children}</div>
  ),
  DrawerContent: ({ children }: any) => (
    <div data-testid='mock-drawer-content'>{children}</div>
  ),
  DrawerDescription: ({ children }: any) => (
    <div data-testid='mock-drawer-description'>{children}</div>
  ),
  DrawerFooter: ({ children }: any) => (
    <div data-testid='mock-drawer-footer'>{children}</div>
  ),
  DrawerHeader: ({ children }: any) => (
    <div data-testid='mock-drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: any) => (
    <div data-testid='mock-drawer-title'>{children}</div>
  )
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img data-testid='mock-image' {...props} />
}));

vi.mock('lucide-react', () => ({
  ArrowRightIcon: () => <svg data-testid='mock-arrow-right' />,
  CalendarDaysIcon: () => <svg data-testid='mock-calendar-days' />,
  HeartPulse: () => <svg data-testid='mock-heart-pulse' />,
  HospitalIcon: () => <svg data-testid='mock-hospital' />
}));

vi.mock('@/app/practitioner/practitioner-availability', () => ({
  default: ({ children }: any) => (
    <div data-testid='mock-practitioner-availability'>{children}</div>
  )
}));

import { useAuth } from '@/context/auth/authContext';
import { dbGet } from '@/lib/indexeddb';
import { usePractitionerListing } from '@/services/clinic';
import { useSearchParams } from 'next/navigation';

import Practitioner from '@/app/practitioner/page';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useAuth).mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: {
        role_name: 'Clinic Admin',
        fhirId: 'admin-1',
        fullname: 'Admin User',
        email: 'admin@clinic.com'
      }
    },
    dispatch: vi.fn()
  });

  vi.mocked(dbGet).mockResolvedValue(null);
});

describe('Practitioner page - listing mode (no practitionerRoleId)', () => {
  it('renders listing when no practitionerRoleId in URL', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as any);
    vi.mocked(dbGet).mockImplementation((_store, args) => {
      if (args?.[1] === 'selected_clinic')
        return Promise.resolve({ value: 'org-1' });
      if (args?.[1] === 'selected_location')
        return Promise.resolve({ value: 'loc-1' });
      return Promise.resolve(null);
    });
    vi.mocked(usePractitionerListing).mockReturnValue({
      practitioners: [
        {
          id: 'prac-1',
          practitionerName: 'Dr. A',
          photoUrl: undefined,
          specialties: ['Cardiology'],
          healthcareServiceNames: ['Consultation'],
          practitionerRoleId: 'role-1'
        },
        {
          id: 'prac-2',
          practitionerName: 'Dr. B',
          photoUrl: undefined,
          specialties: ['Neurology'],
          healthcareServiceNames: ['MRI Scan'],
          practitionerRoleId: 'role-2'
        }
      ],
      isLoading: false,
      isError: false,
      isFetching: false
    });

    render(<Practitioner />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Dr. A')).toBeDefined();
      expect(screen.getByText('Dr. B')).toBeDefined();
    });

    // Verify location-based query was used
    expect(usePractitionerListing).toHaveBeenCalledWith('org-1', 'loc-1');
  });

  it('renders empty state when no practitioners found', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as any);
    vi.mocked(dbGet).mockImplementation((_store, args) => {
      if (args?.[1] === 'selected_clinic')
        return Promise.resolve({ value: 'org-1' });
      return Promise.resolve(null);
    });
    vi.mocked(usePractitionerListing).mockReturnValue({
      practitioners: [],
      isLoading: false,
      isError: false,
      isFetching: false
    });

    render(<Practitioner />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('No Practitioners Found')).toBeDefined();
    });
  });

  it('renders loading state when practitioner listing is loading', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as any);
    vi.mocked(dbGet).mockImplementation((_store, args) => {
      if (args?.[1] === 'selected_clinic')
        return Promise.resolve({ value: 'org-1' });
      return Promise.resolve(null);
    });
    vi.mocked(usePractitionerListing).mockReturnValue({
      practitioners: [],
      isLoading: true,
      isError: false,
      isFetching: true
    });

    render(<Practitioner />, { wrapper: createWrapper() });

    expect(screen.getByTestId('mock-loading-spinner')).toBeDefined();
  });

  it('uses clinicId for organization-based query when no location is stored', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as any);
    vi.mocked(dbGet).mockImplementation((_store, args) => {
      if (args?.[1] === 'selected_clinic')
        return Promise.resolve({ value: 'org-1' });
      // selected_location not stored — return null
      return Promise.resolve(null);
    });
    vi.mocked(usePractitionerListing).mockReturnValue({
      practitioners: [
        {
          id: 'prac-1',
          practitionerName: 'Dr. C',
          photoUrl: undefined,
          specialties: ['General'],
          healthcareServiceNames: ['Check-up'],
          practitionerRoleId: 'role-3'
        }
      ],
      isLoading: false,
      isError: false,
      isFetching: false
    });

    render(<Practitioner />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Dr. C')).toBeDefined();
    });

    // Called with locationId as undefined
    expect(usePractitionerListing).toHaveBeenCalledWith('org-1', undefined);
  });
});
