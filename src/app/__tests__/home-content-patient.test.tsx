/* eslint-disable @typescript-eslint/no-unsafe-argument */

import type { RecommendationsParams } from '@/services/recommendations';
import type {
  Recommendation,
  RecommendationsResponse
} from '@/types/recommendation';
import type {
  ChiefComplaint,
  InterviewResult
} from '@/types/recommendation-interview';
import { searchChiefComplaints } from '@/utils/recommendation-interview';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
const MOOD_COMPLAINT: ChiefComplaint = searchChiefComplaints('low mood')[0];
const MOOD_RESULT: InterviewResult = {
  complaintId: 'low-mood',
  complaintLabel: 'Low Mood & Sadness',
  specialty: 'psychiatry',
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

vi.mock('@/components/general/home/interview/complaint-search', () => ({
  ComplaintSearch: ({
    onSelect
  }: {
    onSelect: (c: ChiefComplaint) => void;
  }) => (
    <button type='button' onClick={() => onSelect(MOOD_COMPLAINT)}>
      Pick low mood
    </button>
  )
}));

vi.mock('@/components/general/home/interview/interview-flow', () => ({
  InterviewFlow: ({
    onComplete
  }: {
    onComplete: (r: InterviewResult) => void;
  }) => (
    <button type='button' onClick={() => onComplete(MOOD_RESULT)}>
      Finish interview
    </button>
  )
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
import HomeContentPatient from '../home-content-patient';

describe('HomeContentPatient - error state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mockUseRecommendations.mockReturnValue({
      data: { specialty: 'psychiatry', recommendations: [REC] },
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    });

    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: { fhirId: 'patient-1' }
      },
      isLoading: false,
      dispatch: vi.fn()
    });
  });

  it('shows error banner with retry when records fetch fails', () => {
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: new Error('Network error')
    });

    render(<HomeContentPatient />);

    expect(screen.getByText('Failed to load records.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Tap to retry' })
    ).toBeInTheDocument();
  });

  it('shows loading skeleton when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: { isAuthenticated: false, userInfo: null },
      isLoading: true,
      dispatch: vi.fn()
    });

    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null
    });

    render(<HomeContentPatient />);
    expect(screen.getAllByTestId('mock-skeleton').length).toBeGreaterThan(0);
  });

  it('shows records list when fetch succeeds', () => {
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [
        {
          id: 'rec-1',
          type: 'Condition',
          resourceType: 'Condition',
          title: 'Test',
          result: '',
          lastUpdated: '2025-01-01'
        }
      ],
      isLoading: false,
      titlesLoading: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      error: null
    });

    render(<HomeContentPatient />);

    expect(screen.getByTestId('mock-record-card')).toBeInTheDocument();
    expect(screen.queryByText('Failed to load records.')).toBeNull();
  });

  it('prompts the patient to start an assessment when no result is saved', () => {
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      error: null
    } as any);

    render(<HomeContentPatient />);

    expect(
      screen.getByRole('button', { name: 'Start Assessment' })
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mock-recommendations')).toBeNull();
  });

  it('fetches live recommendations for a saved interview result', () => {
    window.localStorage.setItem(
      'konsulin:last-interview-result',
      JSON.stringify(MOOD_RESULT)
    );
    mockUseRecommendations.mockReturnValue({
      data: { specialty: 'psychiatry', recommendations: [REC] },
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    });
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      error: null
    } as any);

    render(<HomeContentPatient />);

    expect(mockUseRecommendations).toHaveBeenCalledWith({
      specialty: 'psychiatry'
    });
    expect(screen.getByTestId('mock-recommendations')).toBeInTheDocument();
  });

  it('persists the result and renders recommendations after the interview completes', () => {
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      isLoading: false,
      titlesLoading: false,
      error: null
    } as any);

    render(<HomeContentPatient />);

    fireEventTrigger();
    expect(mockUseRecommendations).toHaveBeenCalledWith({
      specialty: 'psychiatry'
    });
    expect(screen.getByTestId('mock-recommendations')).toBeInTheDocument();
  });
});

/** Completes the mocked interview: Start → complaint → finish. */
function fireEventTrigger() {
  fireEvent.click(screen.getByRole('button', { name: 'Start Assessment' }));
  fireEvent.click(screen.getByRole('button', { name: 'Pick low mood' }));
  fireEvent.click(screen.getByRole('button', { name: 'Finish interview' }));
}
