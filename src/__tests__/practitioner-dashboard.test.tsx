import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerDashboard from '../app/practitioner-dashboard';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/hooks/usePractitionerDashboard', () => ({
  usePractitionerDashboard: vi.fn()
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid='mock-skeleton' className={className} />
  )
}));

let triggerDaySelect: ((date: Date) => void) | null = null;

vi.mock('@/app/practitioner/booking-calendar', () => ({
  default: (props: {
    handleFilterChange: (key: string, val: unknown) => void;
    colorLegend?: Array<{ name: string }>;
  }) => {
    // Expose the handleFilterChange to trigger day selection in tests
    triggerDaySelect = (date: Date) => {
      props.handleFilterChange('date', date);
    };
    return (
      <div data-testid='mock-booking-calendar'>
        {(props.colorLegend ?? []).map((entry: { name: string }) => (
          <div key={entry.name}>{entry.name}</div>
        ))}
      </div>
    );
  }
}));

import { useAuth } from '@/context/auth/authContext';
import { usePractitionerDashboard } from '@/services/hooks/usePractitionerDashboard';

describe('PractitionerDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Practitioner',
          fhirId: 'practitioner-1',
          fullname: 'Dr. Jane'
        }
      },
      dispatch: vi.fn()
    });
    vi.mocked(usePractitionerDashboard).mockReturnValue({
      sessions: [],
      daySessions: [],
      isDayLoading: false,
      dayDots: new Map(),
      colorLegend: [],
      availableTime: [],
      listAvailableDate: [new Date('2026-07-15')],
      isLoading: false
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('passes midnight monthStart to the hook', () => {
    render(<PractitionerDashboard />, { wrapper });

    const callArgs = vi.mocked(usePractitionerDashboard).mock.calls[0][0];
    expect(callArgs.monthStart.getHours()).toBe(0);
    expect(callArgs.monthStart.getMinutes()).toBe(0);
    expect(callArgs.monthStart.getSeconds()).toBe(0);
    expect(callArgs.monthStart.getMilliseconds()).toBe(0);
    // monthStart should be the 1st of the current month
    expect(callArgs.monthStart.getDate()).toBe(1);
  });

  it('passes stable monthStart across re-renders', () => {
    const { rerender } = render(<PractitionerDashboard />, { wrapper });

    const firstCallArgs = vi.mocked(usePractitionerDashboard).mock.calls[0][0];

    // Force a re-render by re-rendering the component
    rerender(<PractitionerDashboard />);

    const secondCallArgs = vi.mocked(usePractitionerDashboard).mock.calls[1][0];
    expect(secondCallArgs.monthStart).toBe(firstCallArgs.monthStart);
    expect(secondCallArgs.monthStart.getHours()).toBe(0);
  });

  it('shows loading skeleton when data is loading', () => {
    vi.mocked(usePractitionerDashboard).mockReturnValue({
      sessions: [],
      daySessions: [],
      isDayLoading: false,
      dayDots: new Map(),
      colorLegend: [],
      availableTime: [],
      listAvailableDate: [],
      isLoading: true
    });
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getAllByTestId('mock-skeleton').length).toBeGreaterThan(0);
  });

  it('renders calendar section', () => {
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getByText('My Schedule')).toBeDefined();
  });

  it('shows select prompt when no selected day', () => {
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getByText('Select a day to view appointments')).toBeDefined();
  });

  it('shows daySessions when a day is selected', () => {
    const mockSession = {
      appointmentId: 'day-appt-1',
      appointmentType: 'Follow-up',
      slotStart: '2026-07-15T02:00:00.000Z',
      slotEnd: '2026-07-15T02:30:00.000Z',
      slotStatus: 'free',
      patientId: 'pat-1',
      patientName: [{ given: ['John'], family: 'Doe' }],
      patientPhoto: [],
      patientEmail: 'john@test.com',
      locationId: 'loc-1',
      locationName: 'Clinic A',
      healthcareServiceName: 'Service'
    };
    vi.mocked(usePractitionerDashboard).mockReturnValue({
      sessions: [],
      daySessions: [mockSession],
      isDayLoading: false,
      dayDots: new Map(),
      colorLegend: [],
      availableTime: [],
      listAvailableDate: [new Date('2026-07-15')],
      isLoading: false
    });
    render(<PractitionerDashboard />, { wrapper });
    // Trigger day selection via the exposed callback
    act(() => {
      triggerDaySelect?.(new Date('2026-07-15'));
    });
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  it('renders color legend when available', () => {
    vi.mocked(usePractitionerDashboard).mockReturnValue({
      sessions: [],
      daySessions: [],
      isDayLoading: false,
      dayDots: new Map(),
      colorLegend: [{ color: '#13C2C2', name: 'Clinic A' }],
      availableTime: [],
      listAvailableDate: [new Date('2026-07-15')],
      isLoading: false
    });
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getByText('Clinic A')).toBeDefined();
  });
});
