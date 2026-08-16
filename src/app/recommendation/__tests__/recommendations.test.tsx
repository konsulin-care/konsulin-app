import type { Recommendation } from '@/types/recommendation';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendationPage from '../page';

const {
  mockUseRecommendations,
  mockUseSpecialties,
  mockReplace,
  mockSearchParams
} = vi.hoisted(() => ({
  mockUseRecommendations: vi.fn(),
  mockUseSpecialties: vi.fn(),
  mockReplace: vi.fn(),
  mockSearchParams: vi.fn(() => new URLSearchParams('specialty=psychology'))
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace, push: vi.fn() })),
  useSearchParams: () => mockSearchParams(),
  usePathname: vi.fn(() => '/recommendation')
}));

vi.mock('@/services/recommendations', () => ({
  useRecommendations: mockUseRecommendations,
  useSpecialties: mockUseSpecialties
}));

// The booking drawer wraps the heavy PractitionerAvailability flow; render the
// trigger through it so card layout is exercised without that dependency.
vi.mock('../recommendation-booking', () => ({
  default: ({ children }: { children: React.ReactNode }) => children
}));

// PageHeader pulls auth/indexeddb/web hooks — stub it in page-level tests.
vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header' />
}));

const recommendation: Recommendation = {
  practitionerRoleId: 'PractitionerRole/role-01-01',
  practitionerId: 'Practitioner/prc-01',
  practitionerName: 'dr. Rara Kusuma',
  specialties: ['Clinical Psychology'],
  scheduleId: 'Schedule/sch-01-01',
  healthcareServiceId: 'HealthcareService/hs-role-01-01-1',
  healthcareServiceName: 'Konsultasi Psikologi Klinis',
  durationMinutes: 30,
  fee: 200_000,
  currency: 'IDR',
  nextSlot: { start: '2026-08-17T03:00:00Z', end: '2026-08-17T03:30:00Z' },
  locationId: 'Location/loc-01',
  locationName: 'Cabang Senen',
  locationAddress: { line: ['Jl. Senen Raya No. 1'], city: 'Jakarta Pusat' },
  distanceKm: 5.4
};

const baseQuery = (
  data: { recommendations: Recommendation[] } | undefined,
  overrides: Record<string, unknown> = {}
) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
  ...overrides
});

beforeEach(() => {
  mockSearchParams.mockReturnValue(new URLSearchParams('specialty=psychology'));
  mockUseSpecialties.mockReturnValue({
    data: ['Clinical Psychology', 'Psychiatry'],
    isLoading: false
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('RecommendationPage', () => {
  it('shows the specialty picker when no specialty param is present', async () => {
    mockSearchParams.mockReturnValue(new URLSearchParams());
    mockUseRecommendations.mockReturnValue(baseQuery({ recommendations: [] }));

    render(<RecommendationPage />);

    expect(await screen.findByText('Pilih Spesialisasi')).toBeInTheDocument();
  });

  it('renders recommendation cards with fee, slot, and distance', async () => {
    mockUseRecommendations.mockReturnValue(
      baseQuery({ recommendations: [recommendation] })
    );

    render(<RecommendationPage />);

    expect(await screen.findByText('dr. Rara Kusuma')).toBeInTheDocument();
    expect(screen.getByText('Konsultasi Psikologi Klinis')).toBeInTheDocument();
    expect(screen.getByText('IDR 200,000')).toBeInTheDocument();
    expect(screen.getByText('5.4 km')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book' }).length).toBe(1);
  });

  it('shows the empty state when no recommendations match', async () => {
    mockUseRecommendations.mockReturnValue(baseQuery({ recommendations: [] }));

    render(<RecommendationPage />);

    expect(
      await screen.findByText('Belum ada rekomendasi untuk spesialisasi ini.')
    ).toBeInTheDocument();
  });

  it('shows an error state with retry that refetches', async () => {
    const refetch = vi.fn();
    mockUseRecommendations.mockReturnValue(
      baseQuery(undefined, { isError: true, refetch })
    );

    render(<RecommendationPage />);

    const retry = await screen.findByRole('button', { name: 'Coba Lagi' });
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalled();
  });

  it('inline specialty filter navigates to the new specialty', async () => {
    mockUseRecommendations.mockReturnValue(
      baseQuery({ recommendations: [recommendation] })
    );

    render(<RecommendationPage />);

    const select = await screen.findByLabelText('Ganti spesialisasi');
    fireEvent.change(select, { target: { value: 'Psychiatry' } });
    expect(mockReplace).toHaveBeenCalledWith(
      '/recommendation?specialty=Psychiatry'
    );
  });
});
