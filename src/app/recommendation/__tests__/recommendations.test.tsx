/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  RecommendationProvider,
  useRecommendationResult
} from '@/context/recommendationContext';
import type { Recommendation } from '@/types/recommendation';
import type { InterviewResult } from '@/types/recommendation-interview';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import RecommendationPage from '../page';

const {
  mockUseRecommendations,
  mockReadLastInterviewResult,
  mockReplace,
  mockInvalidateQueries
} = vi.hoisted(() => ({
  mockUseRecommendations: vi.fn(),
  mockReadLastInterviewResult: vi.fn(),
  mockReplace: vi.fn(),
  mockInvalidateQueries: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ replace: mockReplace, push: vi.fn() }))
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn(() => ({
    isLoading: false,
    dispatch: vi.fn(),
    state: {
      isAuthenticated: false,
      userInfo: { role_name: 'Guest' }
    }
  }))
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

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal();
  return {
    ...actual,
    useQueryClient: vi.fn(() => ({
      invalidateQueries: mockInvalidateQueries
    }))
  };
});

vi.mock('@/components/screening-drawer', () => ({
  default: ({
    open,
    onComplete
  }: {
    open: boolean;
    onComplete?: (result: InterviewResult) => void;
  }) =>
    open ? (
      <div
        data-testid='mock-screening-drawer'
        onClick={() =>
          onComplete?.({
            complaintId: 'anxiety',
            complaintLabel: 'Anxiety',
            specialty: 'psychiatry',
            serviceTypeCode: 'anxiety-care',
            icfDomain: 'mental-emotional-health',
            redFlag: {
              isEmergency: false,
              label: 'Are you safe?',
              resources: []
            }
          })
        }
      />
    ) : null
}));

const recommendation: Recommendation = {
  practitionerRoleId: 'role-01-01',
  practitionerId: 'prc-01',
  practitionerName: 'dr. Rara Kusuma',
  specialties: ['Clinical Psychology'],
  scheduleId: 'sch-01-01',
  healthcareServiceId: 'hs-role-01-01-1',
  healthcareServiceName: 'Konsultasi Psikologi Klinis',
  durationMinutes: 30,
  fee: 200_000,
  currency: 'IDR',
  nextSlot: { start: '2026-08-17T03:00:00Z', end: '2026-08-17T03:30:00Z' },
  locationId: 'loc-01',
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

function renderPage() {
  return render(
    <RecommendationProvider>
      <RecommendationPage />
    </RecommendationProvider>
  );
}

/** Writes to the shared context from outside the page — simulates the FAB. */
function ExternalResultWriter() {
  const { setResult } = useRecommendationResult();
  return (
    <button data-testid='external-writer' onClick={() => setResult(RESULT)}>
      External Write
    </button>
  );
}

beforeEach(() => {
  mockReadLastInterviewResult.mockResolvedValue(null);
  mockUseRecommendations.mockReturnValue(baseQuery({ recommendations: [] }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('RecommendationPage', () => {
  it('prompts the user to start a screening when none has been completed', async () => {
    renderPage();

    expect(
      await screen.findByText('Start a screening to see recommendations')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Start Screening' })
    ).toBeInTheDocument();
    expect(mockUseRecommendations).toHaveBeenCalledWith(null);
  });

  it('opens the ScreeningDrawer from the empty state CTA', async () => {
    renderPage();

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

    renderPage();

    expect(await screen.findByText('dr. Rara Kusuma')).toBeInTheDocument();
    expect(screen.getByText('Konsultasi Psikologi Klinis')).toBeInTheDocument();
    expect(screen.getByText('Clinical Psychology')).toBeInTheDocument();
    expect(mockUseRecommendations).toHaveBeenCalledWith({
      specialty: 'psychiatry'
    });
  });

  it('shows the empty state when no recommendations match', async () => {
    mockReadLastInterviewResult.mockResolvedValue(RESULT);

    renderPage();

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

    renderPage();

    const retry = await screen.findByRole('button', { name: 'Coba Lagi' });
    fireEvent.click(retry);
    expect(refetch).toHaveBeenCalled();
  });

  it('never requires a specialty search param', async () => {
    renderPage();

    await waitFor(() =>
      expect(mockUseRecommendations).toHaveBeenCalledWith(null)
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('renders recommendation cards as links to availability booking page', async () => {
    mockReadLastInterviewResult.mockResolvedValue(RESULT);
    mockUseRecommendations.mockReturnValue(
      baseQuery({ recommendations: [recommendation] })
    );
    renderPage();
    const link = await screen.findByRole('link', {
      name: /dr\. Rara Kusuma/i
    });
    expect(link).toHaveAttribute(
      'href',
      '/practitioner/availability?id=role-01-01&service=hs-role-01-01-1'
    );
  });

  it('invalidates recommendation queries and applies the new result on screening complete', async () => {
    mockReadLastInterviewResult.mockResolvedValue(null);
    mockUseRecommendations.mockReturnValue(baseQuery({ recommendations: [] }));

    renderPage();

    // Empty state shows "Start Screening" — click to open drawer
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start Screening' })
    );
    expect(screen.getByTestId('mock-screening-drawer')).toBeInTheDocument();

    // Click the mock drawer to trigger onComplete
    fireEvent.click(screen.getByTestId('mock-screening-drawer'));

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ['recommendations']
      });
    });
    // The completed result flows through the shared context into the page
    expect(
      await screen.findByRole('heading', { name: 'psychiatry' })
    ).toBeInTheDocument();
  });

  it('updates live when an external writer sets the result in context', async () => {
    mockReadLastInterviewResult.mockResolvedValue(null);
    mockUseRecommendations.mockReturnValue(baseQuery({ recommendations: [] }));

    render(
      <RecommendationProvider>
        <RecommendationPage />
        <ExternalResultWriter />
      </RecommendationProvider>
    );

    // Empty state before any result is available
    expect(
      await screen.findByText('Start a screening to see recommendations')
    ).toBeInTheDocument();
    expect(mockUseRecommendations).toHaveBeenCalledWith(null);

    // An external writer (e.g. the FAB) publishes a completed screening
    fireEvent.click(screen.getByTestId('external-writer'));

    // The page reacts to the shared context without a refresh
    expect(
      await screen.findByRole('heading', { name: 'psychiatry' })
    ).toBeInTheDocument();
    expect(mockUseRecommendations).toHaveBeenLastCalledWith({
      specialty: 'psychiatry'
    });
  });

  it('redirects non-patient/non-guest users away from recommendation', async () => {
    const { useAuth } = await import('@/context/auth/authContext');
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      dispatch: vi.fn(),
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'ClinicAdmin' }
      }
    });
    renderPage();
    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/');
    });
  });
});
