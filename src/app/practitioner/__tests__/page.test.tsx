import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerPage from '../page';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/clinic', () => ({
  usePractitionerListing: vi.fn(),
  useDetailPractitioner: vi.fn()
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

import { usePractitionerListing } from '@/services/clinic';
import { useSearchParams } from 'next/navigation';

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockUsePractitionerListing = vi.mocked(usePractitionerListing);

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
  mockUseSearchParams.mockReturnValue({
    get: vi.fn().mockReturnValue(null)
  } as unknown as ReturnType<typeof useSearchParams>);
  mockUsePractitionerListing.mockReturnValue({
    practitioners: mockPractitioners(),
    isLoading: false,
    isError: false,
    isFetching: false
  });
});

describe('Practitioner page — tabs', () => {
  it('renders Active and Inactive tabs with counts', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByText('Active (1)')).toBeDefined();
    expect(screen.getByText('Inactive (1)')).toBeDefined();
  });

  it('shows active practitioner card on default Active tab', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    // Active content is visible; inactive content has hidden attribute
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('shows PageHeader with Manage Practitioners in listing mode', () => {
    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('page-header')).toHaveTextContent(
      'Manage Practitioners'
    );
  });

  it('shows Manage Practitioner header in detail mode', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('role-1')
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<PractitionerPage />, { wrapper: Wrapper });

    expect(screen.getByTestId('page-header')).toHaveTextContent(
      'Manage Practitioner'
    );
    expect(screen.getByTestId('role-management-shell')).toBeDefined();
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
