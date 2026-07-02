import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PatientDetail from '../patient-detail';

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: vi.fn(),
  usePractitionerRoleHealthcareServices: vi.fn()
}));

vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator }: { pageIndicator: string }) => (
    <div data-testid='page-header'>{pageIndicator}</div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>,
  CheckCircleIcon: () => <div data-testid='check-icon' />
}));

import {
  useDetailPractitioner,
  usePractitionerRoleHealthcareServices
} from '@/services/clinic';

const mockUseDetailPractitioner = vi.mocked(useDetailPractitioner);
const mockUsePractitionerRoleHealthcareServices = vi.mocked(
  usePractitionerRoleHealthcareServices
);

describe('PatientDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDetailPractitioner.mockReturnValue({
      newData: {
        resource: {
          id: 'role-123',
          practitioner: {
            reference: 'Practitioner/prac-1',
            display: 'Dr. Sarah Chen'
          },
          specialty: [{ text: 'Cardiology' }, { text: 'Internal Medicine' }],
          organization: {
            reference: 'Organization/org-1',
            display: 'Jakarta Heart Clinic'
          }
        },
        organization: { name: 'Jakarta Heart Clinic', id: 'org-1' },
        invoice: { totalGross: { value: 500000, currency: 'IDR' } }
      },
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    mockUsePractitionerRoleHealthcareServices.mockReturnValue({
      data: [
        { id: 'hs-1', name: 'General Checkup', active: true },
        { id: 'hs-2', name: 'Heart Screening', active: true }
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as unknown as ReturnType<typeof usePractitionerRoleHealthcareServices>);
  });

  it('renders practitioner name', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Dr. Sarah Chen')).toBeInTheDocument();
  });

  it('renders specialty badges', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
  });

  it('renders clinic location', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Jakarta Heart Clinic')).toBeInTheDocument();
  });

  it('renders healthcare service names', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('General Checkup')).toBeInTheDocument();
    expect(screen.getByText('Heart Screening')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: undefined,
      isLoading: true,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
