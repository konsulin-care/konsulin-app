import type { WeeklyAvailability } from '@/types/availability';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DaySelectorNavigation from '../day-selector-navigation';

const emptyWeekly = {
  0: {},
  1: {},
  2: {},
  3: {},
  4: {},
  5: {},
  6: {}
} as unknown as WeeklyAvailability;

describe('DaySelectorNavigation', () => {
  it('renders 7 day buttons', () => {
    render(
      <DaySelectorNavigation
        selectedDay={0}
        weeklyAvailability={emptyWeekly}
        onSelectDay={vi.fn()}
      />
    );

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(7);
  });

  it('uses responsive sizing that fits on mobile (h-10 w-10 sm:h-12 sm:w-12)', () => {
    render(
      <DaySelectorNavigation
        selectedDay={0}
        weeklyAvailability={emptyWeekly}
        onSelectDay={vi.fn()}
      />
    );

    // Button circles: first child div of each button (the rounded circle)
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      const circle = button.querySelector('div:first-child');
      const classes = circle?.className ?? '';
      expect(classes).toContain('h-10');
      expect(classes).toContain('w-10');
      expect(classes).toContain('sm:h-12');
      expect(classes).toContain('sm:w-12');
    });
  });

  it('uses responsive gap (gap-2 sm:gap-3)', () => {
    render(
      <DaySelectorNavigation
        selectedDay={0}
        weeklyAvailability={emptyWeekly}
        onSelectDay={vi.fn()}
      />
    );

    const container = document.querySelector('div.flex');
    const classes = container?.className ?? '';
    expect(classes).toContain('gap-2');
    expect(classes).toContain('sm:gap-3');
  });
});
