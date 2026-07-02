/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerPage from '../page';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/clinic', () => ({
  usePractitionerListing: vi.fn(),
  useDetailPractitioner: vi.fn(),
  useOrganizationLocations: vi.fn()
}));

vi.mock('@/services/clinicians', () => ({
  useGetPractitionerRolesDetail: vi.fn()
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

vi.mock('@/components/practitioner/practitioner-card', () => ({
  PractitionerCard: ({
    id,
    practitionerName
  }: {
    id: string;
    practitionerName: string;
  }) => (
    <div data-testid='practitioner-card' data-id={id}>
      {practitionerName}
    </div>
  )
}));

vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator }: { pageIndicator: string }) => (
    <div data-testid='page-header'>{pageIndicator}</div>
  )
}));

vi.mock('@/components/general/empty-state', () => ({
  default: ({ title, subtitle }: { title?: string; subtitle?: string }) => (
    <div data-testid='empty-state'>
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>
}));

vi.mock('@/app/practitioner/role-management-shell', () => ({
  default: ({ practitionerRoleId }: { practitionerRoleId: string }) => (
    <div data-testid='role-management-shell' data-role-id={practitionerRoleId}>
      Management
    </div>
  )
}));

vi.mock('@/app/practitioner/patient-detail', () => ({
  default: ({ practitionerRoleId }: { practitionerRoleId: string }) => (
    <div data-testid='patient-detail' data-role-id={practitionerRoleId}>
      Patient Detail
    </div>
  )
}));

vi.mock('@/app/practitioner/practitioner-filter', () => ({
  default: ({ value, onChange }: any) => (
    <div data-testid='practitioner-filter' data-status={value.status}>
      <button
        data-testid='filter-select-active'
        onClick={() => onChange({ status: 'active' })}
      >
        Active
      </button>
      <button
        data-testid='filter-select-all'
        onClick={() => onChange({ status: 'all' })}
      >
        All
      </button>
    </div>
  )
}));

import {
  useOrganizationLocations,
  usePractitionerListing
} from '@/services/clinic';
import { useGetPractitionerRolesDetail } from '@/services/clinicians';
import { useAuth } from '@/context/auth/authContext';
import { useSearchParams } from 'next/navigation';
import { Roles } from '@/constants/roles';

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockUseAuth = vi.mocked(useAuth);
const mockUsePractitionerListing = vi.mocked(usePractitionerListing);
const mockUseOrganizationLocations = vi.mocked(useOrganizationLocations);
const mockUseGetPractitionerRolesDetail = vi.mocked(
  useGetPractitionerRolesDetail
);

function mockPractitioners() {
  return [
    {
      id: 'prac-1',
      active: true,
      practitionerName: 'John Doe',
      photoUrl: undefined,
      specialties: ['Cardiology'],
      healthcareServiceNames: ['Consultation'],
      practitionerRoleId: 'role-1'
    },
    {
      id: 'prac-2',
      active: false,
      practitionerName: 'Jane Smith',
      photoUrl: undefined,
      specialties: ['Radiology'],
      healthcareServiceNames: ['X-Ray'],
      practitionerRoleId: 'role-2'
    }
  ];
}

function Wrapper({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default to ClinicAdmin role for admin listing tests
  mockUseAuth.mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: Roles.ClinicAdmin, fhirId: '' }
    },
    dispatch: vi.fn()
  });

  mockUseSearchParams.mockReturnValue({
    get: vi.fn().mockReturnValue(null)
  } as unknown as ReturnType<typeof useSearchParams>);

  mockUsePractitionerListing.mockReturnValue({
    practitioners: mockPractitioners(),
    isLoading: false,
    isError: false,
    isFetching: false
  });

  mockUseOrganizationLocations.mockReturnValue({
    locations: [],
    isLoading: false,
    isError: false,
    isFetching: false
  });

  mockUseGetPractitionerRolesDetail.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    refetch: vi.fn()
  } as unknown as ReturnType<typeof useGetPractitionerRolesDetail>);
});

describe('Practitioner page — filters', () => {
  it('renders filter component', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('practitioner-filter')).toBeDefined();
  });

  it('shows all practitioners by default (no status filter)', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByText('John Doe')).toBeDefined();
    expect(screen.getByText('Jane Smith')).toBeDefined();
  });

  it('shows only active practitioners when status filter is active', async () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    screen.getByTestId('filter-select-active').click();

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.queryByText('Jane Smith')).toBeNull();
    });
  });

  it('shows PageHeader with Manage Practitioners in listing mode', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('page-header')).toHaveTextContent(
      'Manage Practitioners'
    );
  });

  it('shows Manage Practitioner header in detail mode for admin', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('role-1')
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('page-header')).toHaveTextContent(
      'Manage Practitioner'
    );
    expect(screen.getByTestId('role-management-shell')).toBeDefined();
  });

  it('does not show Manage Practitioner header for patient in detail mode', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: Roles.Patient, fhirId: '' }
      },
      dispatch: vi.fn()
    });
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('role-1')
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('page-header')).not.toHaveTextContent(
      'Manage Practitioner'
    );
    expect(screen.getByTestId('patient-detail')).toBeDefined();
    // Hook is called unconditionally but with empty identifier, so the
    // underlying query (enabled: Boolean) never fires for Patient.
    expect(mockUseGetPractitionerRolesDetail).toHaveBeenCalledWith('');
  });

  it('shows empty state when no practitioners exist', () => {
    mockUsePractitionerListing.mockReturnValue({
      practitioners: [],
      isLoading: false,
      isError: false,
      isFetching: false
    });

    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('empty-state')).toHaveTextContent(
      'No Practitioners Found'
    );
  });

  it('shows loading spinner while loading', () => {
    mockUsePractitionerListing.mockReturnValue({
      practitioners: [],
      isLoading: true,
      isError: false,
      isFetching: true
    });

    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('loading-spinner')).toBeDefined();
  });
});

describe('Practitioner page — filter badges below search row', () => {
  it('shows no badges when no filters are active', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });
    expect(screen.queryByText('Active ×')).toBeNull();
  });

  it('shows filter badge below search row when status filter is active', async () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('filter-select-active'));

    await waitFor(() => {
      expect(screen.getByText('Active ×')).toBeDefined();
    });
  });

  it('removes filter badge when filter is cleared', async () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByTestId('filter-select-active'));
    await waitFor(() => {
      expect(screen.getByText('Active ×')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('filter-select-all'));
    await waitFor(() => {
      expect(screen.queryByText('Active ×')).toBeNull();
    });
  });
});

describe('Practitioner page — search bar', () => {
  it('renders a search input next to the filter button', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText('Search practitioner...');
    expect(searchInput).toBeDefined();
  });

  it('filters practitioners by name using fuzzy match', async () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    // "jd" should fuzzy-match "John Doe"
    const searchInput = screen.getByPlaceholderText('Search practitioner...');
    fireEvent.change(searchInput, { target: { value: 'jd' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.queryByText('Jane Smith')).toBeNull();
    });
  });

  it('clearing the search input shows all practitioners again', async () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText('Search practitioner...');
    fireEvent.change(searchInput, { target: { value: 'jd' } });

    await waitFor(() => {
      expect(screen.queryByText('Jane Smith')).toBeNull();
    });

    // Clear search
    fireEvent.change(searchInput, { target: { value: '' } });

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeDefined();
      expect(screen.getByText('Jane Smith')).toBeDefined();
    });
  });

  it('shows empty state when search matches no practitioners', async () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    const searchInput = screen.getByPlaceholderText('Search practitioner...');
    fireEvent.change(searchInput, { target: { value: 'zzz' } });

    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toHaveTextContent(
        'No Practitioners Match Your Filters'
      );
    });
  });
});
