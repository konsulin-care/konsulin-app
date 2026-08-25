/* eslint-disable max-lines -- pre-existing, out of scope for current refactor */

import { FhirExtensionUrls } from '@/utils/fhir/extensions';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PatientDetail from '../patient-detail';

vi.mock('@/services/clinic-practitioners', () => ({
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

import { useDetailPractitioner } from '@/services/clinic-practitioners';
import { useRouter } from 'next/navigation';

const mockUseDetailPractitioner = vi.mocked(useDetailPractitioner);
const mockUseRouter = vi.mocked(useRouter);

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
        url: FhirExtensionUrls.fee,
        valueMoney: { value: 500_000, currency: 'IDR' }
      },
      {
        url: FhirExtensionUrls.serviceDuration,
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
        url: FhirExtensionUrls.fee,
        valueMoney: { value: 1_500_000, currency: 'IDR' }
      },
      {
        url: FhirExtensionUrls.serviceDuration,
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

    mockUseRouter.mockReturnValue({ push: vi.fn() } as unknown as ReturnType<
      typeof useRouter
    >);
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

  it.each([
    ['clinic location heading', 'Location'],
    ['location name when available', 'Jakarta Heart Clinic - Menteng'],
    [
      'full address from Location resource',
      'Jl. Cimandiri No. 10, Menteng, Kota Adm. Jakarta Pusat, 16127'
    ]
  ])('renders %s', (_, text) => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText(text)).toBeInTheDocument();
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

  it.each([
    ['healthcare service names', 'General Checkup'],
    ['fee formatted as IDR', 'Rp 500,000'],
    ['duration in minutes', '30 min'],
    [
      'extra details for healthcare services',
      'Standard checkup including vitals'
    ]
  ])('renders %s', (_, text) => {
    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('navigates to availability page on service card click', () => {
    const mockPush = vi.fn();
    mockUseRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<
      typeof useRouter
    >);

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
      isFetching: false,
      refetch: vi.fn()
    });

    render(<PatientDetail practitionerRoleId='role-123' />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders nothing when no detail data', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn()
    });

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

  describe('getPractitionerName fallback logic', () => {
    it('constructs name from given and family when name.text is missing', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: {
            id: 'prac-1',
            name: [
              { use: 'official' as const, family: 'Lamuri', given: ['Aly'] }
            ]
          },
          resource: {
            id: 'role-123',
            practitioner: { reference: 'Practitioner/prac-1' },
            specialty: [{ text: 'Cardiology' }],
            organization: { reference: 'Organization/org-1' }
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Aly Lamuri'
      );
    });

    it('uses only family when given is empty', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: {
            id: 'prac-1',
            name: [{ use: 'official' as const, family: 'Lamuri', given: [] }]
          },
          resource: {
            id: 'role-123',
            practitioner: { reference: 'Practitioner/prac-1' },
            specialty: [{ text: 'Cardiology' }],
            organization: { reference: 'Organization/org-1' }
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Lamuri'
      );
    });

    it('uses display when practitioner resource is missing', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: undefined,
          resource: {
            id: 'role-123',
            practitioner: {
              reference: 'Practitioner/prac-1',
              display: 'Dr. Display Name'
            },
            specialty: [{ text: 'Cardiology' }],
            organization: { reference: 'Organization/org-1' }
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Dr. Display Name'
      );
    });

    it('falls back to Practitioner when no name data exists', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: undefined,
          resource: {
            id: 'role-123',
            practitioner: { reference: 'Practitioner/prac-1' },
            specialty: [{ text: 'Cardiology' }],
            organization: { reference: 'Organization/org-1' }
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Practitioner'
      );
    });

    it('falls back to Practitioner when name array is empty', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: { id: 'prac-1', name: [] },
          resource: {
            id: 'role-123',
            practitioner: { reference: 'Practitioner/prac-1' },
            specialty: [{ text: 'Cardiology' }],
            organization: { reference: 'Organization/org-1' }
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
        'Practitioner'
      );
    });
  });

  describe('practitioner photo avatar', () => {
    const photoUrl = 'https://example.com/avatar.jpg';

    it('renders photo image when practitioner has a photo URL', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: {
            id: 'prac-1',
            name: [{ text: 'Dr. Sarah Chen' }],
            photo: [{ url: photoUrl }]
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      const avatarContainer = document.querySelector('.h-12.w-12');
      expect(avatarContainer).toBeInTheDocument();
      const img = avatarContainer?.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.getAttribute('src')).toBe(photoUrl);
    });

    it('falls back to gradient avatar when no photo URL is available', () => {
      render(<PatientDetail practitionerRoleId='role-123' />);
      const avatarContainer = document.querySelector('.h-12.w-12');
      expect(avatarContainer).toBeInTheDocument();
      const img = avatarContainer?.querySelector('img');
      expect(img).toBeInTheDocument();
      // Gradient avatar uses a data URI
      expect(img?.getAttribute('src')).toContain('data:image/svg+xml');
    });

    it('does not render green background on container when photo is shown', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: {
            id: 'prac-1',
            name: [{ text: 'Dr. Sarah Chen' }],
            photo: [{ url: photoUrl }]
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      const avatarContainer = document.querySelector('.h-12.w-12');
      expect(avatarContainer).toBeInTheDocument();
      expect(avatarContainer).not.toHaveClass('bg-[#13c2c2]');
    });

    it('falls back to gradient avatar when photo image fails to load', () => {
      mockUseDetailPractitioner.mockReturnValue({
        newData: buildNewData({
          practitioner: {
            id: 'prac-1',
            name: [{ text: 'Dr. Sarah Chen' }],
            photo: [{ url: photoUrl }]
          }
        }),
        isLoading: false,
        isError: false,
        isFetching: false
      } as unknown as ReturnType<typeof useDetailPractitioner>);

      render(<PatientDetail practitionerRoleId='role-123' />);
      const avatarContainer = document.querySelector('.h-12.w-12');
      const img = avatarContainer?.querySelector('img');
      expect(img?.getAttribute('src')).toBe(photoUrl);

      fireEvent.error(img);

      // After error, should fall back to gradient data URI
      const gradientImg = avatarContainer?.querySelector('img');
      expect(gradientImg?.getAttribute('src')).toContain('data:image/svg+xml');
    });
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
                url: FhirExtensionUrls.fee,
                valueMoney: { value: 100_000, currency: 'IDR' }
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
