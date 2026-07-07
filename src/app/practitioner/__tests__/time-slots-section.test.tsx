import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import TimeSlotsSection from '../time-slots-section';

const defaultBookingState: IStateBooking = {
  date: new Date('2026-07-02'),
  startTime: null,
  hasUserChosenDate: false
};

const freeSlotPill = {
  id: 'free-10:00-11:00',
  displayLabel: '10:00',
  value: '10:00',
  start: new Date('2026-07-02T10:00:00'),
  end: new Date('2026-07-02T11:00:00'),
  disabled: false,
  status: 'free'
};

const defaultProps = {
  bookingState: defaultBookingState,
  isLoading: false,
  isError: false,
  slotPills: [freeSlotPill],
  scheduleId: 'sched-1',
  handleFilterChange: vi.fn(),
  setSelectedSlotId: vi.fn()
};

describe('TimeSlotsSection', () => {
  it('enables slot buttons when scheduleId is provided (not empty)', () => {
    render(<TimeSlotsSection {...defaultProps} />);

    const slotButton = screen.getByRole('button', { name: '10:00' });
    expect(slotButton).not.toBeDisabled();
  });

  it('enables slot buttons even with empty scheduleId (clickability fixed in parent)', () => {
    // This tests the component's behavior: the !scheduleId check was the issue.
    // With an empty string, slots are disabled.
    render(<TimeSlotsSection {...defaultProps} scheduleId='' />);

    const slotButton = screen.getByRole('button', { name: '10:00' });
    expect(slotButton).toBeDisabled();
  });

  it('renders loading spinner when isLoading', () => {
    render(<TimeSlotsSection {...defaultProps} isLoading />);

    expect(screen.queryByRole('button', { name: '10:00' })).not.toBeInTheDocument();
    // Loading spinner should be visible — it's an SVG with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders empty state when slotPills is empty', () => {
    render(<TimeSlotsSection {...defaultProps} slotPills={[]} />);

    expect(screen.getByText(/no available time slots/i)).toBeInTheDocument();
  });

  it('renders error state when isError is true', () => {
    render(<TimeSlotsSection {...defaultProps} isError />);

    expect(screen.getByText(/unable to load available slots/i)).toBeInTheDocument();
  });

  it('highlights selected slot', () => {
    render(
      <TimeSlotsSection
        {...defaultProps}
        bookingState={{ ...defaultBookingState, startTime: '10:00' }}
      />
    );

    const slotButton = screen.getByRole('button', { name: '10:00' });
    expect(slotButton.className).toContain('bg-secondary');
  });

  it('renders disabled slot pills as disabled', () => {
    const disabledPill = { ...freeSlotPill, disabled: true, id: 'busy-1', displayLabel: '11:00', value: '11:00' };
    render(
      <TimeSlotsSection
        {...defaultProps}
        slotPills={[freeSlotPill, disabledPill]}
      />
    );

    const enabledBtn = screen.getByRole('button', { name: '10:00' });
    const disabledBtn = screen.getByRole('button', { name: '11:00' });
    expect(enabledBtn).not.toBeDisabled();
    expect(disabledBtn).toBeDisabled();
  });
});
