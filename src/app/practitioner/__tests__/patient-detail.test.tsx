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

import { useDetailPractitioner } from '@/services/clinic';

const mockUseDetailPractitioner = vi.mocked(useDetailPractitioner);

const FEE_EXTENSION_URL = 'https://konsulin.id/fhir/StructureDefinition/fee';

const baseLocation = {
  name: 'Jakarta Heart Clinic - Menteng',
  id: 'loc-1',
  address: [
    {
      line: ['Jl. Cimandiri No. 10'],
      city: 'Kota Adm. Jakarta Pusat',
      district: 'Menteng',
      postalCode: '16127',
      country: 'ID'
    }
  ]
};

const baseOrganization = {
  name: 'Jakarta Heart Clinic',
  id: 'org-1',
  address: [
    {
      line: ['Jl. Cimandiri No. 10'],
      city: 'Kota Adm. Jakarta Pusat',
      district: 'Menteng',
      postalCode: '16127',
      country: 'ID'
    }
  ]
};

const baseServices = [
  {
    id: 'hs-1',
    name: 'General Checkup',
    active: true,
    extraDetails: 'Standard checkup including vitals',
    extension: [
      {
        url: FEE_EXTENSION_URL,
        valueMoney: { value: 500000, currency: 'IDR' }
      }
    ]
  },
  {
    id: 'hs-2',
    name: 'Heart Screening',
    active: true,
    extraDetails: 'Full cardiac assessment',
    extension: [
      {
        url: FEE_EXTENSION_URL,
        valueMoney: { value: 1500000, currency: 'IDR' }
      }
    ]
  }
];

function buildNewData(overrides: Record<string, unknown> = {}) {
  return {
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
    location: baseLocation,
    organization: baseOrganization,
    healthcareServices: baseServices,
    ...overrides
  };
}

describe('PatientDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDetailPractitioner.mockReturnValue({
      newData: buildNewData(),
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);
  });

  it('renders practitioner name as the primary heading', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Dr. Sarah Chen');
  });

  it('renders specialty badges', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
  });

  it('renders clinic location heading', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Location')).toBeInTheDocument();
  });

  it('renders location name when location is available', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(
      screen.getByText('Jakarta Heart Clinic - Menteng')
    ).toBeInTheDocument();
  });

  it('renders full address from Location resource', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(
      screen.getByText(
        'Jl. Cimandiri No. 10, Menteng, Kota Adm. Jakarta Pusat, 16127'
      )
    ).toBeInTheDocument();
  });

  it('falls back to organization name when location is missing', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: buildNewData({ location: undefined }),
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Jakarta Heart Clinic')).toBeInTheDocument();
  });

  it('falls back to organization address when location has no address', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: buildNewData({
        location: { name: 'Branch', address: [] }
      }),
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Branch')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Jl. Cimandiri No. 10, Menteng, Kota Adm. Jakarta Pusat, 16127'
      )
    ).toBeInTheDocument();
  });

  it('renders healthcare service names', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('General Checkup')).toBeInTheDocument();
    expect(screen.getByText('Heart Screening')).toBeInTheDocument();
  });

  it('does not show green active dot for services', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    const dots = document.querySelectorAll('.bg-green-500');
    expect(dots.length).toBe(0);
  });

  it('shows fee formatted as IDR for each healthcare service', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Rp 500.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
  });

  it('shows extra details for healthcare services', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(
      screen.getByText('Standard checkup including vitals')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Full cardiac assessment')
    ).toBeInTheDocument();
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

  it('renders nothing when no detail data', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    const { container } = render(
      <PatientDetail practitionerRoleId='role-123' />
    );
    expect(container.innerHTML).toBe('');
  });

  it('shows empty services state when healthcareServices is empty', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: buildNewData({ healthcareServices: [] }),
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('No services listed')).toBeInTheDocument();
  });

  it('filters out inactive healthcare services', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: buildNewData({
        healthcareServices: [
          ...baseServices,
          {
            id: 'hs-3',
            name: 'Inactive Service',
            active: false,
            extension: [
              {
                url: FEE_EXTENSION_URL,
                valueMoney: { value: 100000, currency: 'IDR' }
              }
            ]
          }
        ]
      }),
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('General Checkup')).toBeInTheDocument();
    expect(screen.getByText('Heart Screening')).toBeInTheDocument();
    expect(screen.queryByText('Inactive Service')).not.toBeInTheDocument();
  });
});
