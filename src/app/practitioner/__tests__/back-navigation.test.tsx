/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, react/display-name */

import { render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/navigation', () => ({
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() }),
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
    isError: false,
    isFetching: false
  }),
  useOrganizationLocations: vi.fn().mockReturnValue({
    locations: [],
    isLoading: false,
    isError: false,
    isFetching: false
  }),
  usePractitionerRoleHealthcareServices: vi.fn()
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

// PageHeader mock that exposes backRoute for testing
vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator, backRoute }: any) => (
    <div
      data-testid='mock-page-header'
      data-back-route={backRoute ?? ''}
      data-indicator={pageIndicator}
    >
      {pageIndicator}
    </div>
  )
}));

vi.mock('@/components/practitioner/practitioner-card', () => ({
  PractitionerCard: ({ practitionerName, practitionerRoleId }: any) => (
    <div data-testid='mock-practitioner-card' data-role-id={practitionerRoleId}>
      {practitionerName}
    </div>
  )
}));

vi.mock('@/app/practitioner/role-management-shell', () => ({
  default: () => <div data-testid='mock-shell'>Admin Shell</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { dbGet } from '@/lib/indexeddb';
import { usePractitionerListing } from '@/services/clinic';
import { useSearchParams } from 'next/navigation';

import Practitioner from '../page';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('Practitioner page - backRoute behavior', () => {
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

    vi.mocked(dbGet).mockImplementation((_store, args) => {
      if (args?.[1] === 'clinic_organization')
        return Promise.resolve({ value: 'org-1' });
      if (args?.[1] === 'selected_location')
        return Promise.resolve({ value: 'loc-1' });
      return Promise.resolve(null);
    });

    vi.mocked(usePractitionerListing).mockReturnValue({
      practitioners: [],
      isLoading: false,
      isError: false,
      isFetching: false
    });
  });

  it('does NOT pass backRoute in detail mode (with practitionerRoleId)', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('practitionerRoleId=role-123') as any
    );

    render(<Practitioner />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('mock-page-header')).toBeInTheDocument();
    });

    const header = screen.getByTestId('mock-page-header');
    expect(header).toHaveAttribute('data-back-route', '');
    expect(header).toHaveAttribute('data-indicator', 'Manage Practitioner');
  });

  it('does NOT pass backRoute in listing mode (without practitionerRoleId)', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('') as any);

    render(<Practitioner />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('mock-page-header')).toBeInTheDocument();
    });

    const header = screen.getByTestId('mock-page-header');
    expect(header).toHaveAttribute('data-back-route', '');
    expect(header).toHaveAttribute('data-indicator', 'Manage Practitioners');
  });
});
