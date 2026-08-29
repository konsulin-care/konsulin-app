import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AvailabilityPage from '../availability/page';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn()
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/utils/practitioner-ownership', () => ({
  isOwnedRole: vi.fn()
}));

vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator }: { pageIndicator: string }) => (
    <div data-testid='page-header'>{pageIndicator}</div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>
}));

vi.mock('@/app/practitioner/role-management-shell', () => ({
  default: ({ practitionerRoleId }: { practitionerRoleId: string }) => (
    <div data-testid='role-management-shell' data-role-id={practitionerRoleId}>
      Management Shell
    </div>
  )
}));

vi.mock('@/app/practitioner/practitioner-availability', () => ({
  default: ({
    variant,
    practitionerRoleId,
    durationMinutes
  }: {
    variant?: string;
    practitionerRoleId?: string;
    durationMinutes?: number;
  }) => (
    <div
      data-testid='practitioner-availability'
      data-variant={variant}
      data-role-id={practitionerRoleId}
      data-duration={durationMinutes}
    >
      Practitioner Availability
    </div>
  )
}));

vi.mock('@/services/clinic-practitioners', () => ({
  usePractitionerRoleHealthcareServices: vi.fn(),
  useDetailPractitioner: vi.fn(() => ({
    newData: undefined,
    isLoading: false,
    isError: false
  }))
}));

vi.mock('@/utils/fhir/service-duration', () => ({
  getServiceDuration: vi.fn()
}));

vi.mock('@/constants/roles', () => ({
  Roles: {
    ClinicAdmin: 'Clinic Admin',
    Practitioner: 'Practitioner',
    Patient: 'Patient'
  }
}));

import { Roles } from '@/constants/roles';
import { useAuth } from '@/context/auth/authContext';
import { usePractitionerRoleHealthcareServices } from '@/services/clinic-practitioners';
import { getServiceDuration } from '@/utils/fhir/service-duration';
import { isOwnedRole } from '@/utils/practitioner-ownership';
import { useSearchParams } from 'next/navigation';

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockUseAuth = vi.mocked(useAuth);
const mockIsOwnedRole = vi.mocked(isOwnedRole);
const mockUseServices = vi.mocked(usePractitionerRoleHealthcareServices);
const mockGetServiceDuration = vi.mocked(getServiceDuration);

const adminAuthState = {
  state: {
    isAuthenticated: true,
    userInfo: { role_name: Roles.ClinicAdmin }
  }
};

const practitionerAuthState = {
  state: {
    isAuthenticated: true,
    userInfo: { role_name: Roles.Practitioner }
  }
};

const patientAuthState = {
  state: {
    isAuthenticated: true,
    userInfo: { role_name: Roles.Patient }
  }
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
}

describe('AvailabilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue('role-123')
    } as unknown as ReturnType<typeof useSearchParams>);

    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: false, userInfo: {} },
      dispatch: vi.fn()
    });

    mockUseServices.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    } as unknown as ReturnType<typeof usePractitionerRoleHealthcareServices>);

    mockGetServiceDuration.mockReturnValue(60);
  });

  it('renders management shell for ClinicAdmin', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...adminAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('role-management-shell')).toBeInTheDocument();
    expect(screen.getByTestId('role-management-shell')).toHaveAttribute(
      'data-role-id',
      'role-123'
    );
  });

  it('renders management shell for Practitioner with owned role', () => {
    mockIsOwnedRole.mockReturnValue(true);

    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...practitionerAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />, { wrapper: createWrapper() });
    expect(screen.getByTestId('role-management-shell')).toBeInTheDocument();
  });

  it('shows error for Practitioner with unowned role', () => {
    mockIsOwnedRole.mockReturnValue(false);

    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...practitionerAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
  });

  it('renders page variant of PractitionerAvailability for Patient', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...patientAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />, { wrapper: createWrapper() });
    const el = screen.getByTestId('practitioner-availability');
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute('data-variant', 'page');
    expect(el).toHaveAttribute('data-role-id', 'role-123');
  });

  it('passes default duration 60 when no service param and no services', () => {
    mockUseServices.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    } as unknown as ReturnType<typeof usePractitionerRoleHealthcareServices>);

    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...patientAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />, { wrapper: createWrapper() });
    const el = screen.getByTestId('practitioner-availability');
    expect(el).toHaveAttribute('data-duration', '60');
  });

  it('passes serviceId from search params', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn((key: string) => {
        if (key === 'id') return 'role-123';
        if (key === 'service') return 'hs-1';
        return null;
      })
    } as unknown as ReturnType<typeof useSearchParams>);

    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...patientAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />, { wrapper: createWrapper() });
    const el = screen.getByTestId('practitioner-availability');
    expect(el).toHaveAttribute('data-role-id', 'role-123');
  });

  it('shows prompt when no id parameter', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null)
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<AvailabilityPage />, { wrapper: createWrapper() });
    expect(screen.getByText(/no practitioner selected/i)).toBeInTheDocument();
  });
});
