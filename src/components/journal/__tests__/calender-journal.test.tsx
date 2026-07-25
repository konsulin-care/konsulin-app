import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Control system time before any module code evaluates `new Date()`
beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 6, 15)); // July 15, 2026
});

afterAll(() => {
  vi.useRealTimers();
});

// Mock drawer to always render content — avoids Vaul portal/animation in jsdom
vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='drawer-content'>{children}</div>
  ),
  DrawerClose: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: () => null,
  DrawerDescription: () => null
}));

import { format } from 'date-fns';
import CalendarJournal from '../calender-journal';

describe('CalendarJournal', () => {
  it('renders the trigger button with the formatted selected date', () => {
    const testDate = new Date(2026, 6, 10);
    render(<CalendarJournal value={testDate} onChange={vi.fn()} />);

    expect(screen.getByText(format(testDate, 'EEEE'))).toBeInTheDocument();
    expect(
      screen.getByText(format(testDate, 'dd/MM/yyyy'))
    ).toBeInTheDocument();
  });

  it('renders a dash when no date is selected', () => {
    render(<CalendarJournal onChange={vi.fn()} />);

    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the calendar day picker inside the drawer', () => {
    render(
      <CalendarJournal value={new Date(2026, 6, 10)} onChange={vi.fn()} />
    );

    const drawerContent = screen.getByTestId('drawer-content');
    expect(drawerContent.querySelector('.rdp-root')).toBeInTheDocument();
  });

  it('does not disable any dates — all day buttons are clickable', () => {
    render(
      <CalendarJournal value={new Date(2026, 6, 10)} onChange={vi.fn()} />
    );

    // With system time at July 15, 2026 and the calendar showing July 2026,
    // all July days 1-14 are before "today" and would be disabled by
    // `disabled={{ before: today }}`. After removing that prop, none are disabled.
    const disabledButtons = document.querySelectorAll(
      '.rdp-day_button[aria-disabled="true"]'
    );
    expect(disabledButtons.length).toBe(0);
  });
});
