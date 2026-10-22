/* eslint-disable react/display-name */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Minimal mocks for child components
vi.mock('../booking-calendar', () => ({
  default: () => <div data-testid='booking-calendar'>Calendar</div>
}));

vi.mock('../time-slots-section', () => ({
  default: (props: { isError: boolean }) => (
    <div data-testid='time-slots-section' data-is-error={props.isError}>
      Time Slots
    </div>
  )
}));

vi.mock('../booking-form-section', () => ({
  default: () => <div data-testid='booking-form-section'>Form</div>
}));

vi.mock('../payment-drawers', () => ({
  default: () => <div data-testid='payment-drawers'>Payment</div>
}));

vi.mock('../hooks/use-booking-form', () => ({
  useBookingForm: () => ({
    bookingForm: { session_type: '', problem_brief: '' },
    setBookingInformation: vi.fn(),
    errorForm: null,
    relayInvoice: null,
    relayAppointmentId: null,
    handleBookingInformationChange: vi.fn(),
    handleSubmitForm: vi.fn(),
    handleSubmitFormRef: { current: vi.fn() },
    setErrorForm: vi.fn()
  })
}));

vi.mock('../hooks/use-booking-restoration', () => ({
  useBookingRestoration: () => {}
}));

vi.mock('../hooks/use-booking-restore-callbacks', () => ({
  useBookingRestoreCallbacks: () => ({
    onRestoreAppointment: vi.fn(),
    onLoadTempBooking: vi.fn()
  })
}));

vi.mock('../hooks/use-computed-slots', () => ({
  useComputedSlots: () => ({ slotPills: [] })
}));

vi.mock('../hooks/use-fab-action-sync', () => ({
  useFabActionSync: () => {}
}));

vi.mock('../hooks/use-initial-date', () => ({
  useInitialDate: () => {}
}));

vi.mock('../hooks/use-month-change', () => ({
  useMonthChange: () => vi.fn()
}));

vi.mock('../hooks/use-slot-recovery', () => ({
  useSlotRecovery: () => {}
}));

vi.mock('../hooks/usePractitionerRole', () => ({
  usePractitionerRole: () => ({
    detail: null,
    isDetailLoading: false,
    practitionerId: 'prac-1',
    practitionerGivenName: 'John',
    practitionerDisplayName: 'Dr. John',
    practitionerPhotoUrl: '',
    healthcareServiceNames: [],
    effectiveRole: undefined,
    effectiveAvailableTime: [],
    effectiveScheduleId: '',
    practitionerTzOffset: 'Z'
  })
}));

vi.mock('../utils', () => ({
  buildPractitionerAvatar: () => ({}),
  createPageModeFilter: () => vi.fn(),
  getAvailableDays: () => [],
  resolveDrawerServiceName: () => '',
  resolvePagePaymentProps: () => ({
    healthcareServiceName: '',
    invoice: undefined,
    patientId: '',
    practitionerRole: undefined,
    healthcareServiceId: ''
  })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: () => ({
    state: { userInfo: { fhirId: 'patient-1' }, isAuthenticated: true }
  })
}));

vi.mock('@/context/booking/bookingContext', () => ({
  useBooking: () => ({
    state: { date: new Date(), startTime: null, hasUserChosenDate: false },
    dispatch: vi.fn()
  })
}));

vi.mock('@/context/fabContext', () => ({
  useFab: () => ({ dispatch: vi.fn() })
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/api/appointments', () => ({
  useCreateAppointment: () => ({ isPending: false }),
  usePayAppointment: () => ({ mutateAsync: vi.fn(), isPending: false })
}));

vi.mock('@/services/slots', () => ({
  computeFreeSlots: () => [],
  useBusySlotsByPractitioner: () => ({
    data: undefined,
    isLoading: false,
    isError: true
  })
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams()
}));

import PractitionerAvailability from '../practitioner-availability';

describe('PractitionerAvailability isError propagation', () => {
  it('passes isError from useBusySlotsByPractitioner to TimeSlotsSection', () => {
    render(
      <PractitionerAvailability variant='page' practitionerRoleId='role-1' />,
      { wrapper: createWrapper() }
    );

    const timeSlots = screen.getByTestId('time-slots-section');
    expect(timeSlots).toHaveAttribute('data-is-error', 'true');
  });
});
