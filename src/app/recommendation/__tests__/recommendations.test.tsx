/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { Recommendation } from '@/types/recommendation';
import type { InterviewResult } from '@/types/recommendation-interview';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendationPage from '../page';

const { mockUseRecommendations, mockReadLastInterviewResult, mockReplace } =
  vi.hoisted(() => ({
    mockUseRecommendations: vi.fn(),
    mockReadLastInterviewResult: vi.fn(),
    mockReplace: vi.fn()
  }));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace, push: vi.fn() }))
}));

vi.mock('@/services/recommendations', () => ({
  useRecommendations: (params: unknown) => mockUseRecommendations(params),
  useSpecialties: vi.fn(() => ({ data: [], isLoading: false }))
}));

vi.mock('@/utils/recommendation-interview', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readLastInterviewResult: () => mockReadLastInterviewResult()
  };
});

// The booking drawer wraps the heavy PractitionerAvailability flow; render the
// trigger through it so card layout is exercised without that dependency.
vi.mock('../recommendation-booking', () => ({
  default: ({ children }: { children: React.ReactNode }) => children
}));

// PageHeader pulls auth/indexeddb/web hooks — stub it in page-level tests.
vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='page-header' />
}));

vi.mock('@/components/screening-drawer', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? <div data-testid='mock-screening-drawer' /> : null
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

const RESULT: InterviewResult = {
  complaintId: 'anxiety',
  complaintLabel: 'Anxiety',
  specialty: 'psychiatry',
  serviceTypeCode: 'anxiety-care',
  icfDomain: 'mental-emotional-health',
  redFlag: { isEmergency: false, label: 'Are you safe?', resources: [] }
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
  mockReadLastInterviewResult.mockResolvedValue(null);
  mockUseRecommendations.mockReturnValue(baseQuery({ recommendations: [] }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('RecommendationPage', () => {
  it('prompts the user to start a screening when none has been completed', async () => {
    render(<RecommendationPage />);

    expect(
      await screen.findByText('Start a screening to see recommendations')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start Screening' })
    ).toBeInTheDocument();
    expect(mockUseRecommendations).toHaveBeenCalledWith(null);
  });

  it('opens the ScreeningDrawer from the empty state CTA', async () => {
    render(<RecommendationPage />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start Screening' })
    );
    expect(screen.getByTestId('mock-screening-drawer')).toBeInTheDocument();
  });

  it('renders recommendation cards for a saved interview result', async () => {
    mockReadLastInterviewResult.mockResolvedValue(RESULT);
    mockUseRecommendations.mockReturnValue(
      baseQuery({ recommendations: [recommendation] })
    );

    render(<RecommendationPage />);

    expect(await screen.findByText('dr. Rara Kusuma')).toBeInTheDocument();
    expect(screen.getByText('Konsultasi Psikologi Klinis')).toBeInTheDocument();
    expect(screen.getByText('IDR 200,000')).toBeInTheDocument();
    expect(screen.getByText('5.4 km')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book' }).length).toBe(1);
    expect(mockUseRecommendations).toHaveBeenCalledWith({
      specialty: 'psychiatry'
    });
  });

  it('shows the empty state when no recommendations match', async () => {
    mockReadLastInterviewResult.mockResolvedValue(RESULT);

    render(<RecommendationPage />);

    expect(
      await screen.findByText('Belum ada rekomendasi untuk spesialisasi ini.')
    ).toBeInTheDocument();
  });

  it('shows an error state with retry that refetches', async () => {
    const refetch = vi.fn();
    mockReadLastInterviewResult.mockResolvedValue(RESULT);
    mockUseRecommendations.mockReturnValue(
      baseQuery(undefined, { isError: true, refetch })
    );

    render(<RecommendationPage />);

    const retry = await screen.findByRole('button', { name: 'Coba Lagi' });
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalled();
  });

  it('never requires a specialty search param', async () => {
    render(<RecommendationPage />);

    await waitFor(() =>
      expect(mockUseRecommendations).toHaveBeenCalledWith(null)
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
