/* eslint-disable react/display-name, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/context/booking/bookingContext', () => ({
  useBooking: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/api/appointments', () => ({
  useCreateAppointment: vi.fn(() => ({ isLoading: false, mutateAsync: vi.fn() })),
  usePayAppointment: vi.fn(() => ({ isLoading: false, mutateAsync: vi.fn() }))
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { tempBooking: 'temp_booking' },
  dbGet: vi.fn(() => Promise.resolve(null)),
  dbDelete: vi.fn(() => Promise.resolve())
}));

vi.mock('@/utils/redirect-intent', () => ({
  clearIntent: vi.fn(),
  getIntent: vi.fn(() => null),
  saveIntent: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useSearchParams: vi.fn(() => new URLSearchParams())
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn()
  };
});

import { useQuery } from '@tanstack/react-query';

// Mock sub-components to simplify testing
vi.mock('../booking-calendar', () => ({
  default: () => <div data-testid='booking-calendar'>Calendar</div>
}));

vi.mock('../time-slots-section', () => ({
  default: () => <div data-testid='time-slots-section'>Time Slots</div>
}));

vi.mock('../booking-form-section', () => ({
  default: () => <div data-testid='booking-form-section'>Booking Form</div>
}));

vi.mock('../payment-drawer', () => ({
  default: () => <div data-testid='payment-drawer'>Payment Drawer</div>
}));

vi.mock('@/services/clinicians', () => ({
  useFindAvailability: vi.fn(() => ({
    data: null,
    isLoading: false,
    isError: false
  })),
  useBusySlotsByPractitioner: vi.fn(() => ({
    data: [],
    isLoading: false
  })),
  computeFreeSlots: vi.fn(() => [])
}));

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: vi.fn(() => ({
    newData: {
      resource: { id: 'role-123', availableTime: [] },
      practitioner: { id: 'prac-1', name: [{ text: 'Dr. Test' }] }
    },
    isLoading: false
  }))
}));

import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import PractitionerAvailability from '../practitioner-availability';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();

  vi.mocked(useAuth).mockReturnValue({
    state: {
      isAuthenticated: true,
      userInfo: { userId: 'user-1', fhirId: 'patient-1', role_name: 'Patient' }
    },
    isLoading: false
  } as any);

  vi.mocked(useBooking).mockReturnValue({
    state: {
      date: new Date('2026-07-02'),
      startTime: null,
      hasUserChosenDate: false
    },
    dispatch: vi.fn()
  } as any);

  vi.mocked(useQuery).mockReturnValue({
    data: null,
    isLoading: false
  } as any);
});

describe('PractitionerAvailability page variant', () => {
  it('renders booking content directly without drawer wrapper', () => {
    render(
      <PractitionerAvailability
        variant='page'
        practitionerRoleId='role-123'
        durationMinutes={30}
      />,
      { wrapper: createWrapper() }
    );

    // Should render sub-components directly
    expect(screen.getByTestId('booking-calendar')).toBeInTheDocument();
    expect(screen.getByTestId('time-slots-section')).toBeInTheDocument();
    expect(screen.getByTestId('booking-form-section')).toBeInTheDocument();
  });

  it('passes the wrapper children via Drawer in drawer variant', () => {
    render(
      <PractitionerAvailability
        practitionerRole={
          { id: 'role-123', availableTime: [] } as any
        }
        scheduleId='sched-1'
      >
        <div data-testid='trigger-content'>Trigger</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper() }
    );

    // In drawer mode, trigger content should be rendered
    expect(screen.getByTestId('trigger-content')).toBeInTheDocument();
  });
});
