import { RecommendationProvider } from '@/context/recommendationContext';
import type { RecommendationsParams } from '@/services/recommendations';
import type {
  Recommendation,
  RecommendationsResponse
} from '@/types/recommendation';
import type { InterviewResult } from '@/types/recommendation-interview';
import { searchChiefComplaints } from '@/utils/recommendation-interview';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import HomeContentPatient from '../app/home-content-patient';

const queryClient = new QueryClient();

/** Renders the patient home inside the providers it requires. */
function renderPatient() {
  return render(
    <QueryClientProvider client={queryClient}>
      <RecommendationProvider>
        <HomeContentPatient />
      </RecommendationProvider>
    </QueryClientProvider>
  );
}

/** Fields the patient home actually reads from the recommendations hook. */
interface RecQueryStub {
  data?: RecommendationsResponse;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
}

const mockPush = vi.fn();
const mockUseRecommendations =
  vi.fn<(params: RecommendationsParams | null) => RecQueryStub>();
const mockReadLastInterviewResult =
  vi.fn<() => Promise<InterviewResult | null>>();

const REC: Recommendation = {
  practitionerRoleId: 'role-1',
  practitionerId: 'practitioner-42',
  practitionerName: 'dr. Budi Santoso',
  specialties: ['anxiety'],
  scheduleId: 'sched-1',
  healthcareServiceId: 'svc-1',
  healthcareServiceName: 'Cognitive Behavioral Therapy',
  durationMinutes: 60,
  fee: 400_000,
  currency: 'IDR',
  locationId: 'loc-1',
  locationName: 'Rumah Bicara',
  locationAddress: { city: 'Jakarta' },
  distanceKm: 2
};
const MOOD_COMPLAINT = searchChiefComplaints('low mood')[0];
const MOOD_RESULT: InterviewResult = {
  complaintId: 'low-mood',
  complaintLabel: 'Low Mood & Sadness',
  specialty: '2084P0800X',
  serviceTypeCode: 'mood-disorder-care',
  icfDomain: 'mental-emotional-health',
  redFlag: MOOD_COMPLAINT.redFlag
};

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
  default: { useRouter: vi.fn() }
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/usePatientRecords', () => ({
  usePatientRecords: vi.fn()
}));

vi.mock('@/services/recommendations', () => ({
  useRecommendations: (params: RecommendationsParams | null) =>
    mockUseRecommendations(params)
}));

vi.mock('@/utils/recommendation-interview', async importOriginal => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    readLastInterviewResult: () => mockReadLastInterviewResult()
  };
});

vi.mock('@/components/screening-drawer', () => ({
  default: ({
    open,
    onComplete
  }: {
    open: boolean;
    onComplete: (r: InterviewResult) => void;
  }) =>
    open ? (
      <button
        type='button'
        onClick={() => onComplete(MOOD_RESULT)}
        data-testid='screening-drawer'
      >
        Finish interview
      </button>
    ) : null
}));

vi.mock('@/components/general/home/recommendation-card-stack', () => ({
  default: () => <div data-testid='mock-recommendations'>Recommendations</div>
}));

vi.mock('@/components/general/action-card', () => ({
  default: () => <div data-testid='mock-action-card'>Action Card</div>
}));

vi.mock('@/components/shared/record-card', () => ({
  default: () => <div data-testid='mock-record-card'>Record Card</div>
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid='mock-skeleton'>Skeleton</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { usePatientRecords } from '@/hooks/usePatientRecords';

const baseRecQuery: RecQueryStub = {
  data: { specialty: '2084P0800X', recommendations: [REC] },
  isLoading: false,
  isError: false,
  refetch: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReadLastInterviewResult.mockResolvedValue(null);
  mockUseRecommendations.mockReturnValue(baseRecQuery);

  vi.mocked(useAuth).mockReturnValue({
    state: {
      isAuthenticated: true,
      userInfo: { fhirId: 'patient-1' }
    },
    isLoading: false,
    dispatch: vi.fn()
  });

  vi.mocked(usePatientRecords).mockReturnValue({
    records: [],
    isLoading: false,
    titlesLoading: false,
    error: null,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false
  });
});

describe('HomeContentPatient', () => {
  it('renders quick action links', () => {
    renderPatient();

    expect(screen.getByText('Action Card')).toBeInTheDocument();
  });

  it('renders previous records section', () => {
    renderPatient();

    expect(screen.getByText('Previous Records')).toBeInTheDocument();
    expect(screen.getByText('See All')).toBeInTheDocument();
  });

  it('shows at most 5 previous records', () => {
    const records = Array.from({ length: 8 }, (_, i) => ({
      id: `Encounter/enc-${i}`
    }));

    vi.mocked(usePatientRecords).mockReturnValue({
      records,
      isLoading: false,
      titlesLoading: false,
      error: null
    } as never);

    renderPatient();

    expect(screen.getAllByTestId('mock-record-card')).toHaveLength(5);
  });

  it('shows loading skeleton when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: null },
      isLoading: true,
      dispatch: vi.fn()
    });

    renderPatient();

    expect(screen.getAllByTestId('mock-skeleton').length).toBeGreaterThan(0);
  });

  it('shows error banner with retry when records fetch fails', () => {
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      error: new Error('Network error'),
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false
    });

    renderPatient();

    expect(screen.getByText('Failed to load records.')).toBeInTheDocument();
  });

  it('prompts the patient to start a screening when no result is saved', () => {
    renderPatient();

    expect(
      screen.getByRole('button', { name: 'Start Assessment' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mock-recommendations')).toBeNull();
  });

  it('fetches live recommendations for a saved interview result', async () => {
    mockReadLastInterviewResult.mockResolvedValue(MOOD_RESULT);

    renderPatient();

    await waitFor(() =>
      expect(mockUseRecommendations).toHaveBeenCalledWith({
        specialty: '2084P0800X'
      })
    );
    expect(screen.getByTestId('mock-recommendations')).toBeInTheDocument();
  });

  it('opens the ScreeningDrawer and renders recommendations after completion', () => {
    renderPatient();

    fireEvent.click(screen.getByRole('button', { name: 'Start Assessment' }));
    expect(screen.getByTestId('screening-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish interview' }));
    expect(mockUseRecommendations).toHaveBeenCalledWith({
      specialty: '2084P0800X'
    });
    expect(screen.getByTestId('mock-recommendations')).toBeInTheDocument();
  });
});
