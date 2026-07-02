/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import type { PractitionerRole } from 'fhir/r4';
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
  router: { push: vi.fn() } as any,
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

  it('renders Problem Brief textarea', () => {
    render(<BookingFormSection {...defaultProps} />);

    expect(screen.getByText('Problem Brief')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Type your message here.')
    ).toBeInTheDocument();
  });

  it('hides CTA buttons and Batalkan when hideCta is true', () => {
    render(
      <BookingFormSection {...defaultProps} hideCta={true} />
    );

    expect(screen.queryByRole('button', { name: /book now/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Batalkan')).not.toBeInTheDocument();
  });

  it('shows CTA buttons and Batalkan when hideCta is false', () => {
    render(
      <BookingFormSection {...defaultProps} hideCta={false} />
    );

    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument();
    expect(screen.getByText('Batalkan')).toBeInTheDocument();
  });

  it('shows CTA buttons and Batalkan by default (hideCta undefined)', () => {
    render(<BookingFormSection {...defaultProps} />);

    expect(screen.getByRole('button', { name: /book now/i })).toBeInTheDocument();
    expect(screen.getByText('Batalkan')).toBeInTheDocument();
  });

  it('does not render form fields when no startTime selected', () => {
    render(
      <BookingFormSection
        {...defaultProps}
        bookingState={{ ...defaultBookingState, startTime: null }}
      />
    );

    // Problem Brief textarea is inside startTime conditional
    expect(screen.queryByText('Problem Brief')).not.toBeInTheDocument();
    // CTA button is always rendered (outside startTime conditional), just disabled
    const button = screen.queryByRole('button', { name: /book now/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('shows login prompt when not authenticated', () => {
    render(
      <BookingFormSection
        {...defaultProps}
        isAuthenticated={false}
        hideCta={false}
      />
    );

    expect(
      screen.getByText(/silakan daftar atau masuk/i)
    ).toBeInTheDocument();
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
});
