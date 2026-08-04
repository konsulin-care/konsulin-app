import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock PractitionerRoute — simulate passing or blocking
const mockPractitionerRoute = vi.fn(
  ({ children }: { children: React.ReactNode }) => (
    <div data-testid='practitioner-route'>{children}</div>
  )
);

vi.mock('@/components/auth/practitioner-route', () => ({
  PractitionerRoute: (props: { children: React.ReactNode }) =>
    mockPractitionerRoute(props)
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useTodaySessions', () => ({
  useTodaySessions: vi.fn()
}));

vi.mock('@/services/api/assessment', () => ({
  useQuestionnaireSoap: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams())
}));

vi.mock('@/components/page-header', () => ({
  __esModule: true,
  default: () => <div data-testid='page-header'>PageHeader</div>
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: Record<string, unknown>) => (
    <div data-testid='loading-spinner' {...props}>
      Loading...
    </div>
  )
}));

vi.mock('../participant', () => ({
  __esModule: true,
  default: () => <div data-testid='participant-selector'>Participant</div>
}));

vi.mock('@/components/soap-report/soap-form', () => ({
  __esModule: true,
  default: () => <div data-testid='soap-form'>SoapForm</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { useTodaySessions } from '@/hooks/useTodaySessions';
import { useQuestionnaireSoap } from '@/services/api/assessment';
import Soap from '../page';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
    queryClient
  };
}

describe('SoapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Practitioner',
          fhirId: 'practitioner-1',
          fullname: 'Dr. Smith',
          email: 'dr@clinic.com'
        }
      },
      dispatch: vi.fn()
    });

    vi.mocked(useTodaySessions).mockReturnValue({
      data: [{ patientId: 'patient-1', patientName: 'John Doe' }],
      isLoading: false
    });

    vi.mocked(useQuestionnaireSoap).mockReturnValue({
      data: { id: 'soap-q', title: 'SOAP Note' },
      isLoading: false
    } as ReturnType<typeof useQuestionnaireSoap>);

    mockPractitionerRoute.mockImplementation(
      ({ children }: { children: React.ReactNode }) => (
        <div data-testid='practitioner-route'>{children}</div>
      )
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state during questionnaire fetch', () => {
    vi.mocked(useQuestionnaireSoap).mockReturnValue({
      data: undefined,
      isLoading: true
    } as ReturnType<typeof useQuestionnaireSoap>);

    const { wrapper } = createWrapper();
    render(<Soap />, { wrapper });

    expect(screen.getByTestId('loading-spinner')).toBeDefined();
  });

  it('renders loading state during patient list fetch', () => {
    vi.mocked(useTodaySessions).mockReturnValue({
      data: undefined,
      isLoading: true
    });

    const { wrapper } = createWrapper();
    render(<Soap />, { wrapper });

    expect(screen.getByTestId('loading-spinner')).toBeDefined();
  });

  it('renders SOAP form when Practitioner is authenticated', () => {
    const { wrapper } = createWrapper();
    render(<Soap />, { wrapper });

    expect(screen.getByTestId('practitioner-route')).toBeDefined();
    expect(screen.getByTestId('page-header')).toBeDefined();
    expect(screen.getByTestId('participant-selector')).toBeDefined();
    expect(screen.getByTestId('soap-form')).toBeDefined();
  });

  it('shows access denied when PractitionerRoute blocks non-Practitioner', () => {
    mockPractitionerRoute.mockImplementation(() => (
      <div data-testid='access-denied'>Access Denied</div>
    ));

    const { wrapper } = createWrapper();
    render(<Soap />, { wrapper });

    expect(screen.getByTestId('access-denied')).toBeDefined();
    expect(screen.queryByTestId('soap-form')).toBeNull();
  });
});
