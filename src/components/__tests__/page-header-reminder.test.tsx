import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { addDays, addHours, format } from 'date-fns';
import type { Bundle } from 'fhir/r4';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../page-header';

const { mockUseAuth, mockUseResearchProgress, mockUseUpcomingEvents } =
  vi.hoisted(() => ({
    mockUseAuth: vi.fn<
      () => {
        isLoading: boolean;
        state: {
          isAuthenticated: boolean;
          userInfo: { role_name?: string; fhirId?: string; fullname?: string };
        };
      }
    >(),
    mockUseResearchProgress: vi.fn(),
    mockUseUpcomingEvents: vi.fn<
      () => {
        appointmentData: Bundle | null;
        sessionData: Bundle | null;
      }
    >()
  }));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => mockUseAuth()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/'
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: () => mockUseUpcomingEvents()
}));

vi.mock('@/services/api/research', () => ({
  useResearchProgress: mockUseResearchProgress
}));

vi.mock('@/components/role-avatar-popup', () => ({
  default: () => <div data-testid='role-avatar' />
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

/** Naive local ISO start for an appointment offset by the given days from now. */
function startOn(dayOffset: number): string {
  return format(addDays(new Date(), dayOffset), "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * Naive local ISO start one hour from now: strictly in the future while
 * staying within the today-or-tomorrow urgency window.
 */
function urgentStart(): string {
  return format(addHours(new Date(), 1), "yyyy-MM-dd'T'HH:mm:ss");
}

/** Appointment bundle with the given start usable by patient and practitioner parsers. */
function makeBundle(startIso: string): Bundle {
  return {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 1,
    entry: [
      {
        resource: {
          resourceType: 'Appointment',
          id: 'appt-1',
          status: 'booked',
          start: startIso,
          slot: [{ reference: 'Slot/slot-1' }],
          participant: [
            { actor: { reference: 'Patient/pat-1' }, status: 'accepted' },
            { actor: { reference: 'Practitioner/prac-1' }, status: 'accepted' },
            {
              actor: { reference: 'PractitionerRole/role-1' },
              status: 'accepted'
            },
            {
              actor: { reference: 'HealthcareService/svc-1' },
              status: 'accepted'
            },
            { actor: { reference: 'Location/loc-1' }, status: 'accepted' }
          ]
        }
      },
      {
        resource: {
          resourceType: 'Slot',
          id: 'slot-1',
          status: 'busy',
          start: startIso,
          end: '2099-01-01T10:00:00Z'
        }
      },
      {
        resource: {
          resourceType: 'Practitioner',
          id: 'prac-1',
          name: [{ family: 'Doe', given: ['Jane'] }],
          telecom: [{ system: 'email', value: 'jane@test.com' }]
        }
      },
      {
        resource: {
          resourceType: 'Patient',
          id: 'pat-1',
          name: [{ family: 'Smith', given: ['Pat'] }]
        }
      },
      {
        resource: { resourceType: 'Location', id: 'loc-1', name: 'Main Clinic' }
      },
      {
        resource: {
          resourceType: 'HealthcareService',
          id: 'svc-1',
          name: 'Consultation'
        }
      }
    ]
  } as unknown as Bundle;
}

const BATCH_1 = {
  id: 'batch-1',
  start: '2026-08-01',
  end: '2026-08-31',
  questionnaireIds: ['phq2']
};

const PROGRESS_DATA = {
  studies: [
    {
      study: {
        resourceType: 'ResearchStudy',
        id: 'research',
        status: 'active',
        title: 'Konsulin Mental Health Survey'
      },
      batches: [BATCH_1],
      currentBatch: BATCH_1,
      completedCount: 1,
      totalCount: 2,
      isComplete: false,
      firstUncompletedQuestionnaireId: 'phq2',
      completedQuestionnaireIds: [],
      history: [
        {
          batchId: 'batch-1',
          start: '2026-08-01',
          end: '2026-08-31',
          participated: true
        }
      ],
      consecutiveBatches: 1
    }
  ],
  cumulativeResponses: 1,
  questionnaireResponses: [],
  questionnaireXp: 8,
  completedQuestionnaireIds: [],
  consentedStudyIds: []
};

function mockPatient() {
  mockUseAuth.mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: 'Patient', fhirId: 'pat-1', fullname: 'Pat Smith' }
    }
  });
}

beforeEach(() => {
  mockUseResearchProgress.mockReturnValue({
    data: PROGRESS_DATA,
    isLoading: false
  });
  mockUseUpcomingEvents.mockReturnValue({
    appointmentData: null,
    sessionData: null
  });
});

describe('PageHeader single-card reminder', () => {
  it('shows the session card and See All when the session starts today', () => {
    mockPatient();
    mockUseUpcomingEvents.mockReturnValue({
      appointmentData: makeBundle(urgentStart()),
      sessionData: null
    });

    render(<PageHeader />, { wrapper: createWrapper() });

    expect(screen.getByText(/Upcoming Session With/)).toBeTruthy();
    expect(screen.getByText('Jane Doe')).toBeTruthy();
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
    expect(screen.getByText('See All')).toBeTruthy();
    expect(document.querySelector('.swiper')).toBeNull();
  });

  it('shows the session card and See All when the session starts tomorrow', () => {
    mockPatient();
    mockUseUpcomingEvents.mockReturnValue({
      appointmentData: makeBundle(startOn(1)),
      sessionData: null
    });

    render(<PageHeader />, { wrapper: createWrapper() });

    expect(screen.getByText(/Upcoming Session With/)).toBeTruthy();
    expect(screen.getByText('See All')).toBeTruthy();
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });

  it('shows the research card without See All when the session is not urgent', () => {
    mockPatient();
    mockUseUpcomingEvents.mockReturnValue({
      appointmentData: makeBundle(startOn(5)),
      sessionData: null
    });

    render(<PageHeader />, { wrapper: createWrapper() });

    expect(screen.getByTestId('research-header-widget')).toBeTruthy();
    expect(screen.queryByText(/Upcoming Session With/)).toBeNull();
    expect(screen.queryByText('See All')).toBeNull();
  });

  it('always shows the session card for practitioners without the research widget', () => {
    mockUseAuth.mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Practitioner', fhirId: 'prac-1' }
      }
    });
    mockUseUpcomingEvents.mockReturnValue({
      appointmentData: null,
      sessionData: makeBundle(startOn(5))
    });

    render(<PageHeader />, { wrapper: createWrapper() });

    expect(screen.getByText(/Upcoming Session With/)).toBeTruthy();
    expect(screen.getByText('Pat Smith')).toBeTruthy();
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
    expect(screen.getByText('See All')).toBeTruthy();
  });

  it('shows the research card without See All when there is no session', () => {
    mockPatient();

    render(<PageHeader />, { wrapper: createWrapper() });

    expect(screen.getByTestId('research-header-widget')).toBeTruthy();
    expect(screen.queryByText(/Upcoming Session With/)).toBeNull();
    expect(screen.queryByText('See All')).toBeNull();
  });

  it('shows no card while research is loading and no session exists', () => {
    mockPatient();
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });

    render(<PageHeader />, { wrapper: createWrapper() });

    expect(screen.queryByTestId('research-header-widget')).toBeNull();
    expect(screen.queryByText(/Upcoming Session With/)).toBeNull();
  });

  it('switches from research to the session card when an urgent session arrives', async () => {
    mockPatient();
    mockUseResearchProgress.mockReturnValue({
      data: undefined,
      isLoading: true
    });
    mockUseUpcomingEvents.mockReturnValue({
      appointmentData: undefined,
      sessionData: undefined
    });

    const wrapper = createWrapper();
    const { rerender } = render(<PageHeader />, { wrapper });
    expect(screen.queryByText(/Upcoming Session With/)).toBeNull();

    mockUseResearchProgress.mockReturnValue({
      data: PROGRESS_DATA,
      isLoading: false
    });
    mockUseUpcomingEvents.mockReturnValue({
      appointmentData: makeBundle(startOn(1)),
      sessionData: null
    });

    rerender(<PageHeader />);

    await waitFor(() => {
      expect(screen.getByText(/Upcoming Session With/)).toBeTruthy();
    });
    expect(screen.queryByTestId('research-header-widget')).toBeNull();
  });
});
