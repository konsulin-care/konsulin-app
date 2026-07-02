import { fireEvent, render, screen } from '@testing-library/react';
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

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() }))
}));

import { useDetailPractitioner } from '@/services/clinic';
import { useRouter } from 'next/navigation';

const mockUseDetailPractitioner = vi.mocked(useDetailPractitioner);
const mockUseRouter = vi.mocked(useRouter);

const FEE_EXTENSION_URL = 'https://konsulin.id/fhir/StructureDefinition/fee';
const DURATION_EXTENSION_URL =
  'https://konsulin.id/fhir/StructureDefinition/serviceDuration';

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
      },
      {
        url: DURATION_EXTENSION_URL,
        valueInteger: 30
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
      },
      {
        url: DURATION_EXTENSION_URL,
        valueInteger: 60
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
    practitioner: {
      id: 'prac-1',
      name: [{ text: 'Dr. Sarah Chen' }]
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

    mockUseRouter.mockReturnValue({ push: vi.fn() } as any);
  });

  it('renders practitioner name as the primary heading', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent('Dr. Sarah Chen');
  });

  it('renders practitioner name from included practitioner resource', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: buildNewData({
        practitioner: {
          id: 'prac-1',
          name: [{ text: 'Dr. Sarah Chen' }]
        }
      }),
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Dr. Sarah Chen'
    );
  });

  it('renders avatar element next to practitioner name', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    // The avatar is rendered in a 48px rounded-full container
    const avatarContainer = document.querySelector('.h-12.w-12');
    expect(avatarContainer).toBeInTheDocument();
    expect(avatarContainer).toHaveClass('rounded-full');
  });

  it('renders specialty badges with truncation when >3', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: buildNewData({
        resource: {
          id: 'role-123',
          practitioner: { reference: 'Practitioner/prac-1' },
          specialty: [
            { text: 'Cardiology' },
            { text: 'Internal Medicine' },
            { text: 'Pediatrics' },
            { text: 'Neurology' },
            { text: 'Dermatology' }
          ]
        }
      }),
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
    expect(screen.getByText('Pediatrics')).toBeInTheDocument();
    expect(screen.getByText('(2+)')).toBeInTheDocument();
    expect(screen.queryByText('Neurology')).not.toBeInTheDocument();
    expect(screen.queryByText('Dermatology')).not.toBeInTheDocument();
  });

  it('shows no overflow when specialties <= 3', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
    expect(screen.getByText('Internal Medicine')).toBeInTheDocument();
    expect(screen.queryByText(/\(\+\)/)).not.toBeInTheDocument();
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

  it('shows fee formatted as IDR for each healthcare service', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('Rp 500.000')).toBeInTheDocument();
    expect(screen.getByText('Rp 1.500.000')).toBeInTheDocument();
  });

  it('shows duration in minutes for each service', () => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
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

  it('navigates to availability page on service card click', () => {
    const mockPush = vi.fn();
    mockUseRouter.mockReturnValue({ push: mockPush } as any);

    render(<PatientDetail practitionerRoleId='role-123' />);
    const cards = screen.getAllByText(/General Checkup|Heart Screening/);

    // Click the first service card
    fireEvent.click(cards[0].closest('[class*="cursor-pointer"]') ?? cards[0]);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('/practitioner/availability?id=role-123')
    );
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining('service=hs-1')
    );
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
