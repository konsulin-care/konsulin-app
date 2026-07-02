import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { type ReactNode } from 'react';
import BookingCalendar from '../booking-calendar';

/** Wrap BookingCalendar in a Drawer so DrawerTitle has the required Dialog context. */
function Wrapper({ children }: { children: ReactNode }) {
  return (
    <Drawer open={true}>
      <DrawerContent>{children}</DrawerContent>
    </Drawer>
  );
}

const defaultProps = {
  bookingState: {
    date: new Date('2026-07-02'),
    startTime: null,
    hasUserChosenDate: false
  } as any,
  handleFilterChange: () => {},
  resetData: () => {},
  listAvailableDate: [new Date('2026-07-02')],
  availableTime: [] as any[],
  today: new Date('2026-07-02')
};

describe('BookingCalendar', () => {
  it('renders DrawerTitle by default', () => {
    render(
      <Wrapper>
        <BookingCalendar {...defaultProps} />
      </Wrapper>
    );

    expect(screen.getByText('See Availability')).toBeInTheDocument();
  });

  it('hides DrawerTitle when hideHeader is true', () => {
    render(
      <Wrapper>
        <BookingCalendar {...defaultProps} hideHeader={true} />
      </Wrapper>
    );

    expect(screen.queryByText('See Availability')).not.toBeInTheDocument();
  });
});
