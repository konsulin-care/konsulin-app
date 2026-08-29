/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import { useSearchParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Mocks – vi.mock is hoisted so these run before any import
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn()
}));

vi.mock('@/context/booking/bookingContext', () => ({
  useBooking: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/clinicians', () => ({
  useGetPractitionerRoleWorkingLocations: vi.fn().mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn()
  })
}));

vi.mock('@/utils/practitioner-ownership', () => ({
  storeOwnedRoleIds: vi.fn()
}));

vi.mock('@/constants/roles', () => ({
  Roles: {
    ClinicAdmin: 'Clinic Admin',
    Practitioner: 'Practitioner',
    Patient: 'Patient'
  }
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null),
  dbSet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/clinic-practitioners', () => ({
  useDetailPractitioner: vi.fn().mockReturnValue({
    newData: undefined,
    isLoading: false,
    isError: false,
    isFetching: false
  }),
  usePractitionerRoleHealthcareServices: vi.fn(),
  usePractitionerListing: vi.fn().mockReturnValue({
    practitioners: [],
    isLoading: false,
    isError: false,
    isFetching: false
  }),
  useOrganizationLocations: vi.fn().mockReturnValue({
    locations: [],
    isLoading: false,
    isError: false,
    isFetching: false
  })
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
  LoadingSpinnerIcon: () => <svg data-testid='mock-loading-spinner' />
}));

vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator }: any) => (
    <div data-testid='mock-page-header'>{pageIndicator}</div>
  )
}));

vi.mock('@/app/practitioner/role-management-shell', () => ({
  default: ({ practitionerRoleId }: any) => (
    <div data-testid='mock-shell' data-role-id={practitionerRoleId}>
      Admin Shell
    </div>
  )
}));

vi.mock('@/app/practitioner/practitioner-filter', () => ({
  default: () => <div data-testid='mock-practitioner-filter' />
}));

// Static import – mocks are hoisted, so the component gets mocked deps.
import Practitioner from '@/app/practitioner/page';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let mockSearchParams: any;

beforeEach(() => {
  mockSearchParams = new URLSearchParams('id=test-role-id');
  vi.mocked(useSearchParams).mockReturnValue(mockSearchParams);
  vi.mocked(useBooking).mockReturnValue({
    state: { isBookingSubmitted: false },
    dispatch: vi.fn()
  });
  vi.mocked(useAuth).mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: Roles.ClinicAdmin, fhirId: '' }
    },
    dispatch: vi.fn()
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Practitioner page – detail (admin) mode', () => {
  it('renders the admin management shell when id is present', () => {
    render(<Practitioner />);

    expect(screen.getByTestId('mock-shell')).toBeInTheDocument();
    expect(screen.getByTestId('mock-shell')).toHaveAttribute(
      'data-role-id',
      'test-role-id'
    );
  });

  it('passes the correct page header for detail mode', () => {
    render(<Practitioner />);

    expect(screen.getByTestId('mock-page-header')).toHaveTextContent(
      'Manage Practitioner'
    );
  });
});

describe('Practitioner page – detail (patient) mode', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: Roles.Patient, fhirId: '' }
      },
      dispatch: vi.fn()
    });
  });

  it('shows View Provided Services page indicator for patient detail', () => {
    mockSearchParams.set('id', 'role-123');
    render(<Practitioner />);

    expect(screen.getByTestId('mock-page-header')).toHaveTextContent(
      'View Provided Services'
    );
  });
});
