import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BookingCalendar from '../booking-calendar';
import type { IStateBooking } from '@/context/booking/bookingTypes';
import type { PractitionerRoleAvailableTime } from 'fhir/r4';

vi.mock('@/components/ui/calendar-temp', () => ({
  Calendar: ({ components }: any) => {
    const DayButton = components?.DayButton;
    const testDate = new Date('2026-07-04');
    return (
      <div data-testid='mock-calendar'>
        {DayButton && (
          <DayButton
            day={{ date: testDate }}
            modifiers={{}}
            children='4'
          />
        )}
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
