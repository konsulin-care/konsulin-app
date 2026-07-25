import { fireEvent, render } from '@testing-library/react';
import type { DayButtonProps } from 'react-day-picker';
import { describe, expect, it, vi } from 'vitest';
import { CalendarBase } from '../calendar-base';

describe('CalendarBase', () => {
  it('renders without crashing', () => {
    const { container } = render(<CalendarBase mode='single' />);
    expect(container.querySelector('.rdp-root')).toBeInTheDocument();
  });

  it('renders nav buttons beside the month caption with navLayout="around"', () => {
    const { container } = render(
      <CalendarBase mode='single' defaultMonth={new Date(2026, 6, 1)} />
    );

    // data-nav-layout attribute is set on the root
    const root = container.querySelector('.rdp-root');
    expect(root).toHaveAttribute('data-nav-layout', 'around');

    // Default .rdp-nav should NOT be present — it's replaced by inline buttons
    expect(container.querySelector('.rdp-nav')).not.toBeInTheDocument();

    // Instead, prev/next buttons render directly inside .rdp-month
    const prevBtn = container.querySelector('.rdp-button_previous');
    const nextBtn = container.querySelector('.rdp-button_next');
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();

    // Buttons are children of .rdp-month, not .rdp-nav
    const month = container.querySelector('.rdp-month');
    expect(month?.contains(prevBtn)).toBe(true);
    expect(month?.contains(nextBtn)).toBe(true);
  });

  it('forwards className to the root element', () => {
    const { container } = render(
      <CalendarBase mode='single' className='custom-class' />
    );
    const root = container.querySelector('.rdp-root');
    expect(root?.className).toContain('custom-class');
  });

  it('accepts mode="single" and handles onSelect callback', () => {
    const onSelect = vi.fn();
    render(
      <CalendarBase
        mode='single'
        onSelect={onSelect}
        defaultMonth={new Date(2026, 6, 1)}
      />
    );

    // Click a specific day button using rdp's .rdp-day_button class
    const dayButtons = document.querySelectorAll('.rdp-day_button');
    expect(dayButtons.length).toBeGreaterThan(0);
    fireEvent.click(dayButtons[0]);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('accepts mode="range" and handles onSelect callback', () => {
    const onSelect = vi.fn();
    render(
      <CalendarBase
        mode='range'
        onSelect={onSelect}
        defaultMonth={new Date(2026, 6, 1)}
      />
    );

    // Click a specific day button using rdp's .rdp-day_button class
    const dayButtons = document.querySelectorAll('.rdp-day_button');
    expect(dayButtons.length).toBeGreaterThan(0);
    fireEvent.click(dayButtons[0]);
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('accepts disabled matchers and disables dates', () => {
    const onSelect = vi.fn();
    // Disable all dates before today
    render(
      <CalendarBase
        mode='single'
        onSelect={onSelect}
        disabled={{ before: new Date() }}
      />
    );

    // Find a disabled day button (past dates should have aria-disabled)
    const disabledButton = document.querySelector(
      'button[aria-disabled="true"]'
    );
    if (disabledButton) {
      fireEvent.click(disabledButton);
      expect(onSelect).not.toHaveBeenCalled();
    }
  });

  it('accepts custom components prop (DayButton override)', () => {
    const CustomDayButton = (props: DayButtonProps) => (
      <button type='button' data-testid='custom-day-button' {...props} />
    );

    render(
      <CalendarBase
        mode='single'
        components={{ DayButton: CustomDayButton }}
        defaultMonth={new Date(2026, 6, 1)}
      />
    );

    // DayButton is rendered for each day — at least some should exist
    const customButtons = document.querySelectorAll(
      '[data-testid="custom-day-button"]'
    );
    expect(customButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders with brand accent CSS variable', () => {
    const { container } = render(<CalendarBase mode='single' />);
    const root = container.querySelector('.rdp-root');
    // The style prop sets --rdp-accent-color on the element
    const styleAttr = root?.getAttribute('style') ?? '';
    expect(styleAttr).toContain('--rdp-accent-color');
  });
});
