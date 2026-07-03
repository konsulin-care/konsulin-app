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

vi.mock('@/context/fabDirtyContext', () => ({
  useFabDirty: vi.fn()
}));

vi.mock('@/services/api/appointments', () => ({
  useCreateAppointment: vi.fn(() => ({ isLoading: false, mutateAsync: vi.fn() })),
  useCreateSlot: vi.fn(() => ({ isLoading: false, mutateAsync: vi.fn() })),
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

// Mock sub-components to simplify testing — pass through practitionerGivenName
vi.mock('../booking-calendar', () => ({
  default: () => <div data-testid='booking-calendar'>Calendar</div>
}));

vi.mock('../time-slots-section', () => ({
  default: (props: any) => (
    <div
      data-testid='time-slots-section'
      data-schedule-id={props.scheduleId}
    >
      Time Slots
    </div>
  )
}));

vi.mock('../booking-form-section', () => ({
  default: (props: any) => (
    <div
      data-testid='booking-form-section'
      data-hide-cta={props.hideCta}
      data-practitioner-given-name={props.practitionerGivenName ?? ''}
    >
      Booking Form
    </div>
  )
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
      practitioner: {
        id: 'prac-1',
        name: [{ text: 'Dr. Test', given: ['Test'] }]
      },
      schedule: { id: 'sched-123' }
    },
    isLoading: false
  }))
}));

import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import { useFabDirty } from '@/context/fabDirtyContext';
import { useDetailPractitioner } from '@/services/clinic';
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

  vi.mocked(useFabDirty).mockReturnValue({
    dirtyState: null,
    setDirtyState: vi.fn()
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

  it('passes effectiveScheduleId to TimeSlotsSection in page mode', () => {
    render(
      <PractitionerAvailability
        variant='page'
        practitionerRoleId='role-123'
      />,
      { wrapper: createWrapper() }
    );

    const timeSlotsSection = screen.getByTestId('time-slots-section');
    // scheduleId should be truthy (from detail.schedule.id), not empty string
    expect(timeSlotsSection.dataset.scheduleId).not.toBe('');
  });

  it('passes hideCta=true to BookingFormSection in page mode', () => {
    render(
      <PractitionerAvailability
        variant='page'
        practitionerRoleId='role-123'
      />,
      { wrapper: createWrapper() }
    );

    const bookingFormSection = screen.getByTestId('booking-form-section');
    expect(bookingFormSection.dataset.hideCta).toBe('true');
  });

  it('applies pb-24 to page wrapper for FAB clearance', () => {
    render(
      <PractitionerAvailability
        variant='page'
        practitionerRoleId='role-123'
      />,
      { wrapper: createWrapper() }
    );

    // Navigate up from a child to find the pb-24 wrapper
    const calendarEl = screen.getByTestId('booking-calendar');
    // booking-calendar > parent (flex h-full flex-col) > grandparent (flex flex-col px-1 pb-24)
    const wrapperDiv = calendarEl.parentElement?.parentElement;
    expect(wrapperDiv?.className).toContain('pb-24');
  });

  it('passes practitioner given name to BookingFormSection', () => {
    render(
      <PractitionerAvailability
        variant='page'
        practitionerRoleId='role-123'
      />,
      { wrapper: createWrapper() }
    );

    const bookingFormSection = screen.getByTestId('booking-form-section');
    expect(bookingFormSection.dataset.practitionerGivenName).toBe('Test');
  });

  it('passes empty practitionerGivenName when practitioner has no given name', () => {
    // Override the mock to return practitioner without `given`
    vi.mocked(useDetailPractitioner).mockReturnValueOnce({
      newData: {
        resource: { id: 'role-456', availableTime: [] },
        practitioner: {
          id: 'prac-2',
          name: [{ text: 'Dr. No Given Name' }]
        },
        schedule: { id: 'sched-456' }
      },
      isLoading: false
    });

    render(
      <PractitionerAvailability
        variant='page'
        practitionerRoleId='role-456'
      />,
      { wrapper: createWrapper() }
    );

    const bookingFormSection = screen.getByTestId('booking-form-section');
    // When no given name, the prop should fall back to an empty string or not be passed
    expect(bookingFormSection.dataset.practitionerGivenName).toBe('');
  });

  it('calls setDirtyState with null on mount in page mode (form not ready)', () => {
    render(
      <PractitionerAvailability
        variant='page'
        practitionerRoleId='role-123'
      />,
      { wrapper: createWrapper() }
    );

    const { setDirtyState } = vi.mocked(useFabDirty)();
    // setDirtyState should have been called, at minimum with null (form not valid)
    expect(setDirtyState).toHaveBeenCalled();
    expect(setDirtyState).toHaveBeenCalledWith(null);
  });

  it('does not crash when FabDirtyContext is available in drawer variant', () => {
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

    // Should render without crashing — trigger content is visible
    expect(screen.getByTestId('trigger-content')).toBeInTheDocument();
  });
});
