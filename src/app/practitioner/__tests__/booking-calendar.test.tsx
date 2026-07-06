import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BookingCalendar from '../booking-calendar';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import type { PractitionerRoleAvailableTime } from 'fhir/r4';

let triggerMonthChange: ((month: Date) => void) | null = null;

vi.mock('@/components/ui/calendar-temp', () => ({
  Calendar: ({ components, onSelect, onMonthChange, disabled }: any) => {
    const DayButton = components?.DayButton;
    const testDate = new Date('2026-07-04');
    triggerMonthChange = onMonthChange ? (month: Date) => onMonthChange(month) : null;

    const handleSelect = (date: Date) => {
      // Only call onSelect if the date is NOT disabled
      if (disabled?.(date)) return;
      onSelect?.(date);
    };

    return (
      <div data-testid='mock-calendar'>
        {DayButton && (
          <DayButton
            day={{ date: testDate }}
            modifiers={{}}
          >
            4
          </DayButton>
        )}
        <button
          data-testid='select-date-btn'
          onClick={() => handleSelect(new Date('2026-07-15'))}
        >
          Select Day
        </button>
        <button
          data-testid='select-unavailable-date-btn'
          onClick={() => handleSelect(new Date('2026-07-04'))}
        >
          Select Unavailable Day
        </button>
      </div>
    );
  }
}));

vi.mock('@/components/ui/drawer', () => ({
  DrawerDescription: () => <div />,
  DrawerTitle: ({ children }: any) => <div>{children}</div>
}));

const mockBookingState: IStateBooking = {
  date: new Date('2026-07-15'),
  startTime: null,
  hasUserChosenDate: false,
  isBookingSubmitted: false
} as unknown as IStateBooking;

const mockHandleChange = vi.fn();
const mockReset = vi.fn();

const mockAvailableTime: PractitionerRoleAvailableTime[] = [
  { daysOfWeek: ['mon', 'wed', 'fri'] }
];

describe('BookingCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    triggerMonthChange = null;
  });
  it('renders calendar with default props', () => {
    render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={mockHandleChange}
        resetData={mockReset}
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
      />
    );
    expect(screen.getByTestId('mock-calendar')).toBeDefined();
  });

  it('renders color legend when provided', () => {
    const legend = [
      { color: '#13C2C2', name: 'Clinic A' },
      { color: '#F5222D', name: 'Clinic B' },
      { color: '#D9D9D9', name: 'Unspecified Location' }
    ];
    render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={mockHandleChange}
        resetData={mockReset}
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
        colorLegend={legend}
      />
    );
    expect(screen.getByText('Clinic A')).toBeDefined();
    expect(screen.getByText('Clinic B')).toBeDefined();
    expect(screen.getByText('Unspecified Location')).toBeDefined();
  });

  it('does not render legend when not provided', () => {
    const { container } = render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={mockHandleChange}
        resetData={mockReset}
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
      />
    );
    expect(container.querySelector('.flex.flex-col.gap-1')).toBeNull();
  });

  it('renders day dots below the date number in a flex-col container', () => {
    const dayDots = new Map<string, string[]>();
    dayDots.set('2026-07-04', ['#13C2C2']);

    const { container } = render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={mockHandleChange}
        resetData={mockReset}
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
        dayDots={dayDots}
      />
    );

    const dotContainer = container.querySelector(
      '.flex.flex-col.items-center'
    );
    expect(dotContainer).toBeDefined();
    const dot = dotContainer?.querySelector('[role="listitem"]');
    expect(dot).toBeDefined();
  });

  it('blocks clicking dates not in listAvailableDate by default', () => {
    const handleChange = vi.fn();

    render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={handleChange}
        resetData={mockReset}
        // Only July 15 is in the available list
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
      />
    );

    // Click a date (July 4 - Saturday) NOT in listAvailableDate
    act(() => {
      screen.getByTestId('select-unavailable-date-btn').click();
    });

    // handleFilterChange should NOT be called (date is disabled)
    expect(handleChange).not.toHaveBeenCalledWith('date', expect.any(Date));
  });

  it('enables all dates when showAllDates is true', () => {
    const handleChange = vi.fn();

    render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={handleChange}
        resetData={mockReset}
        // Only July 15 is in the available list, but showAllDates overrides
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
        showAllDates={true}
      />
    );

    // Click a date (July 4 - Saturday) NOT in listAvailableDate
    act(() => {
      screen.getByTestId('select-unavailable-date-btn').click();
    });

    // handleFilterChange SHOULD be called (showAllDates bypasses restriction)
    expect(handleChange).toHaveBeenCalledWith('date', expect.any(Date));
  });

  it('does not reset date when month changes', () => {
    const handleChange = vi.fn();
    const resetData = vi.fn();

    render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={handleChange}
        resetData={resetData}
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
      />
    );

    act(() => {
      triggerMonthChange?.(new Date('2026-07-01'));
    });

    // handleFilterChange should NOT have been called with 'date'
    expect(handleChange).not.toHaveBeenCalledWith('date', expect.any(Date));

    // resetData should still be called (clearing time slots on month nav)
    expect(resetData).toHaveBeenCalledTimes(1);
  });

  it('passes dayDots to DayButton component', () => {
    const dayDots = new Map<string, string[]>();
    dayDots.set('2026-07-04', ['#13C2C2', '#F5222D']);

    render(
      <BookingCalendar
        bookingState={mockBookingState}
        handleFilterChange={mockHandleChange}
        resetData={mockReset}
        listAvailableDate={[new Date('2026-07-15')]}
        availableTime={mockAvailableTime}
        today={new Date('2026-07-01')}
        dayDots={dayDots}
      />
    );
    const dots = screen
      .getAllByRole('listitem')
      .filter(el => el.style.backgroundColor);
    expect(dots.length).toBeGreaterThanOrEqual(2);
  });
});
