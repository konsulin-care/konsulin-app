import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
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

vi.mock('@/app/practitioner/patient-availability', () => ({
  default: ({ practitionerRoleId }: { practitionerRoleId: string }) => (
    <div data-testid='patient-availability' data-role-id={practitionerRoleId}>
      Patient Availability
    </div>
  )
}));

vi.mock('@/constants/roles', () => ({
  Roles: {
    ClinicAdmin: 'Clinic Admin',
    Practitioner: 'Practitioner',
    Patient: 'Patient'
  }
}));

import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/auth/authContext';
import { isOwnedRole } from '@/utils/practitioner-ownership';
import { Roles } from '@/constants/roles';

const mockUseSearchParams = vi.mocked(useSearchParams);
const mockUseAuth = vi.mocked(useAuth);
const mockIsOwnedRole = vi.mocked(isOwnedRole);

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
  });

  it('renders management shell for ClinicAdmin', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...adminAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />);
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

    render(<AvailabilityPage />);
    expect(screen.getByTestId('role-management-shell')).toBeInTheDocument();
  });

  it('shows error for Practitioner with unowned role', () => {
    mockIsOwnedRole.mockReturnValue(false);

    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...practitionerAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />);
    expect(screen.getByText(/not authorized/i)).toBeInTheDocument();
  });

  it('renders patient availability for Patient', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      ...patientAuthState,
      dispatch: vi.fn()
    });

    render(<AvailabilityPage />);
    expect(screen.getByTestId('patient-availability')).toBeInTheDocument();
    expect(screen.getByTestId('patient-availability')).toHaveAttribute(
      'data-role-id',
      'role-123'
    );
  });

  it('shows prompt when no id parameter', () => {
    mockUseSearchParams.mockReturnValue({
      get: vi.fn().mockReturnValue(null)
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<AvailabilityPage />);
    expect(screen.getByText(/no practitioner selected/i)).toBeInTheDocument();
  });
});
