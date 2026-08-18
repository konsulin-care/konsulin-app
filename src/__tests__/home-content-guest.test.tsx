import type { RecommendationsParams } from '@/services/recommendations';
import type {
  Recommendation,
  RecommendationsResponse
} from '@/types/recommendation';
import type { InterviewResult } from '@/types/recommendation-interview';
import { searchChiefComplaints } from '@/utils/recommendation-interview';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
  specialty: 'psychiatry',
  serviceTypeCode: 'mood-disorder-care',
  icfDomain: 'mental-emotional-health',
  redFlag: MOOD_COMPLAINT.redFlag
};

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush }))
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

vi.mock('@/components/general/home/guest-onboarding-section', () => ({
  default: () => <div data-testid='mock-onboarding'>Onboarding</div>
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: () => <div data-testid='mock-skeleton'>Skeleton</div>
}));

import HomeContentGuest from '../app/home-content-guest';

const baseRecQuery: RecQueryStub = {
  data: { specialty: 'psychiatry', recommendations: [REC] },
  isLoading: false,
  isError: false,
  refetch: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  mockReadLastInterviewResult.mockResolvedValue(null);
  mockUseRecommendations.mockReturnValue(baseRecQuery);
});

describe('HomeContentGuest', () => {
  it('prompts the guest to start a screening when no result is saved', () => {
    render(<HomeContentGuest />);

    expect(
      screen.getByRole('button', { name: 'Start Assessment' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mock-recommendations')).toBeNull();
  });

  it('fetches live recommendations for a saved interview result', async () => {
    mockReadLastInterviewResult.mockResolvedValue(MOOD_RESULT);

    render(<HomeContentGuest />);

    await waitFor(() =>
      expect(mockUseRecommendations).toHaveBeenCalledWith({
        specialty: 'psychiatry'
      })
    );
    expect(screen.getByTestId('mock-recommendations')).toBeInTheDocument();
  });

  it('opens the ScreeningDrawer and renders recommendations after completion', () => {
    render(<HomeContentGuest />);

    fireEvent.click(screen.getByRole('button', { name: 'Start Assessment' }));
    expect(screen.getByTestId('screening-drawer')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Finish interview' }));
    expect(mockUseRecommendations).toHaveBeenCalledWith({
      specialty: 'psychiatry'
    });
    expect(screen.getByTestId('mock-recommendations')).toBeInTheDocument();
  });

  it('renders onboarding and clinic quick actions', () => {
    render(<HomeContentGuest />);

    expect(screen.getByTestId('mock-onboarding')).toBeInTheDocument();
    expect(screen.getByTestId('mock-action-card')).toBeInTheDocument();
  });
});
