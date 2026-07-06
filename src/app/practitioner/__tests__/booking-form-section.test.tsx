import type { IStateBooking } from '@/context/booking/bookingTypes';
import { render, screen } from '@testing-library/react';
import type { PractitionerRole } from 'fhir/r4';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { describe, expect, it, vi } from 'vitest';
import BookingFormSection from '../booking-form-section';

const defaultBookingState: IStateBooking = {
  date: new Date('2026-07-02'),
  startTime: '10:00',
  hasUserChosenDate: true
};

const defaultBookingForm = {
  session_type: 'offline',
  problem_brief: 'Need help with anxiety'
};

const defaultProps = {
  bookingForm: defaultBookingForm,
  bookingState: defaultBookingState,
  errorForm: null,
  handleBookingInformationChange: vi.fn(),
  handleSubmitForm: vi.fn(),
  scheduleId: 'sched-1',
  isCreateAppointmentLoading: false,
  isPaying: false,
  isAuthenticated: true,
  isPending: false,
  practitionerRole: { id: 'role-1' } as PractitionerRole,
  selectedSlotId: 'slot-1',
  scheduleById: undefined,
  router: {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn()
  } as unknown as AppRouterInstance,
  saveIntent: vi.fn(),
  startTransition: (fn: () => void) => fn(),
  setIsOpen: vi.fn()
};

describe('BookingFormSection', () => {
  it('renders "Book Now" button text when authenticated', () => {
    render(<BookingFormSection {...defaultProps} />);

    const button = screen.getByRole('button', { name: /book now/i });
    expect(button).toBeInTheDocument();
  });

  it('does not render session type dropdown', () => {
    render(<BookingFormSection {...defaultProps} />);

    expect(screen.queryByText('Session Type')).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Offline')).not.toBeInTheDocument();
  });

  it('renders health concern label with practitioner name', () => {
    render(
      <BookingFormSection {...defaultProps} practitionerGivenName='Sarah' />
    );

    expect(screen.getByText(/what should sarah know/i)).toBeInTheDocument();
  });

  it('renders health concern label with fallback when given name not provided', () => {
    render(<BookingFormSection {...defaultProps} />);

    expect(
      screen.getByText(/what should the doctor know/i)
    ).toBeInTheDocument();
  });

  it('shows mandatory asterisk next to the label', () => {
    render(<BookingFormSection {...defaultProps} />);

    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk.className).toContain('text-destructive');
  });

  it('has mental health focused placeholder', () => {
    render(<BookingFormSection {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      /anxiety|depressed mood|sleep|racing thoughts|mental health/i
    );
    expect(textarea).toBeInTheDocument();
  });

  it('renders health concern textarea even without selected time slot', () => {
    render(
      <BookingFormSection
        {...defaultProps}
        bookingState={{ ...defaultBookingState, startTime: null }}
      />
    );

    // Textarea should be visible even when no time slot is selected
    expect(
      screen.getByText(/what should the doctor know/i)
    ).toBeInTheDocument();

    // CTA button is still rendered, just disabled
    const button = screen.queryByRole('button', { name: /book now/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('applies bg-white class to textarea', () => {
    render(<BookingFormSection {...defaultProps} />);

    const textarea = screen.getByPlaceholderText(
      /anxiety|depressed mood|sleep|racing thoughts|mental health/i
    );
    expect(textarea.className).toContain('bg-white');
  });

  it('textarea value is synced with bookingForm.problem_brief', () => {
    render(
      <BookingFormSection
        {...defaultProps}
        bookingForm={{
          ...defaultBookingForm,
          problem_brief: 'Feeling anxious for 2 weeks'
        }}
      />
    );

    const textarea = screen.getByPlaceholderText(
      /anxiety|depressed mood|sleep|racing thoughts|mental health/i
    );
    expect(textarea).toHaveValue('Feeling anxious for 2 weeks');
  });

  it('shows login prompt when not authenticated', () => {
    render(
      <BookingFormSection
        {...defaultProps}
        isAuthenticated={false}
        hideCta={false}
      />
    );

    expect(screen.getByText(/silakan daftar atau masuk/i)).toBeInTheDocument();
  });

  it('renders error messages when errorForm is provided', () => {
    render(
      <BookingFormSection
        {...defaultProps}
        errorForm={['Problem Brief', 'Tipe Session']}
      />
    );

    expect(
      screen.getByText(/lengkapi problem brief dan tipe session/i)
    ).toBeInTheDocument();
  });

  it('hides CTA buttons and Batalkan when hideCta is true', () => {
    render(<BookingFormSection {...defaultProps} hideCta />);

    expect(
      screen.queryByRole('button', { name: /book now/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Batalkan')).not.toBeInTheDocument();
  });

  it('shows CTA buttons and Batalkan when hideCta is false', () => {
    render(<BookingFormSection {...defaultProps} hideCta={false} />);

    expect(
      screen.getByRole('button', { name: /book now/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Batalkan')).toBeInTheDocument();
  });

  it('shows CTA buttons and Batalkan by default (hideCta undefined)', () => {
    render(<BookingFormSection {...defaultProps} />);

    expect(
      screen.getByRole('button', { name: /book now/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Batalkan')).toBeInTheDocument();
  });
});
