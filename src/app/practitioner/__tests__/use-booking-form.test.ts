import { useBooking } from '@/context/booking/bookingContext';
import { useRelayBooking } from '@/services/api/appointments';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useBookingForm } from '../hooks/use-booking-form';

vi.mock('@/context/booking/bookingContext', () => ({
  useBooking: vi.fn()
}));

vi.mock('@/services/api/appointments', () => ({
  useRelayBooking: vi.fn()
}));

const mockBookingState = {
  date: new Date('2026-07-10'),
  startTime: '09:00',
  hasUserChosenDate: true
};

const mockRelayBooking = vi.fn();

const DEFAULT_OPTIONS = {
  isPageMode: false,
  effectiveScheduleId: 'sched-1',
  practitionerId: 'prac-1',
  durationMinutes: 60,
  propHealthcareServiceId: 'hs-1',
  propOrganizationId: 'org-1',
  pageDate: undefined as Date | undefined,
  patientId: 'pat-1',
  setSelectedSlotId: vi.fn(),
  setPaymentOpen: vi.fn()
};

describe('useBookingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useBooking).mockReturnValue({
      state: mockBookingState,
      dispatch: vi.fn()
    });
    vi.mocked(useRelayBooking).mockReturnValue({
      mutateAsync: mockRelayBooking
    } as unknown as ReturnType<typeof useRelayBooking>);
  });

  it('initializes with default empty form', () => {
    const { result } = renderHook(() => useBookingForm(DEFAULT_OPTIONS));

    expect(result.current.bookingForm).toEqual({
      session_type: 'offline',
      problem_brief: ''
    });
    expect(result.current.errorForm).toBeNull();
    expect(result.current.relayInvoice).toBeNull();
  });

  it('handleBookingInformationChange updates a single field', () => {
    const { result } = renderHook(() => useBookingForm(DEFAULT_OPTIONS));

    act(() => {
      result.current.handleBookingInformationChange(
        'problem_brief',
        'Need help'
      );
    });

    expect(result.current.bookingForm.problem_brief).toBe('Need help');
    expect(result.current.bookingForm.session_type).toBe('offline');
  });

  it('sets errorForm when required fields are missing on submit', async () => {
    const { result } = renderHook(() =>
      useBookingForm({ ...DEFAULT_OPTIONS, isPageMode: true })
    );

    await act(async () => {
      await result.current.handleSubmitForm();
    });

    expect(result.current.errorForm).not.toBeNull();
    expect(result.current.errorForm?.length).toBeGreaterThan(0);
    expect(mockRelayBooking).not.toHaveBeenCalled();
  });

  it('calls relayBooking when form is valid', async () => {
    mockRelayBooking.mockResolvedValue({
      slotId: 'Slot/slot-1',
      invoiceId: 'Invoice/inv-1',
      appointmentId: 'Appointment/appt-1',
      fee: { value: 150_000, currency: 'IDR' }
    });

    const setSelectedSlotId = vi.fn();
    const setPaymentOpen = vi.fn();

    const { result } = renderHook(() =>
      useBookingForm({
        ...DEFAULT_OPTIONS,
        setSelectedSlotId,
        setPaymentOpen,
        pageDate: new Date('2026-07-10')
      })
    );

    // Set valid form data
    act(() => {
      result.current.handleBookingInformationChange(
        'problem_brief',
        'Need help'
      );
    });

    await act(async () => {
      await result.current.handleSubmitForm();
    });

    expect(mockRelayBooking).toHaveBeenCalled();
    expect(setPaymentOpen).toHaveBeenCalledWith(true);
    expect(result.current.relayInvoice).toEqual({
      resourceType: 'Invoice',
      id: 'inv-1',
      status: 'issued',
      totalNet: { value: 150_000, currency: 'IDR' }
    });
    expect(result.current.relayAppointmentId).toBe('appt-1');
  });

  it('clears errorForm when all fields become filled', () => {
    // Start with a state where booking state has missing fields
    vi.mocked(useBooking).mockReturnValue({
      state: { date: null, startTime: null },
      dispatch: vi.fn()
    });

    const { result, rerender } = renderHook(() =>
      useBookingForm({
        ...DEFAULT_OPTIONS,
        isPageMode: true,
        pageDate: new Date('2026-07-10')
      })
    );

    // Simulate error
    act(() => {
      result.current.handleBookingInformationChange('problem_brief', '');
    });

    // Rerender with booking state that has all fields filled
    vi.mocked(useBooking).mockReturnValue({
      state: { date: new Date('2026-07-10'), startTime: '09:00' },
      dispatch: vi.fn()
    });

    rerender();

    // After error was set and then cleared, should be null
    expect(result.current.errorForm).toBeNull();
  });

  it('handleSubmitFormRef always points to latest handleSubmitForm', () => {
    const { result, rerender } = renderHook(() =>
      useBookingForm(DEFAULT_OPTIONS)
    );

    const firstRef = result.current.handleSubmitFormRef;
    expect(firstRef.current).toBe(result.current.handleSubmitForm);

    // Re-render to make sure ref stays stable
    rerender();
    expect(result.current.handleSubmitFormRef).toBe(firstRef);
    expect(result.current.handleSubmitFormRef.current).toBe(
      result.current.handleSubmitForm
    );
  });
});
