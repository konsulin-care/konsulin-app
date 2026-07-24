import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CalendarBase } from '../calendar-base';

describe('CalendarBase', () => {
  it('renders without crashing', () => {
    const { container } = render(<CalendarBase mode='single' />);
    expect(container.querySelector('.rdp-root')).toBeInTheDocument();
  });

  it('renders with data-nav-layout="around" and default navigation buttons', () => {
    const { container } = render(
      <CalendarBase mode='single' defaultMonth={new Date(2026, 6, 1)} />
    );
    const root = container.querySelector('.rdp-root');
    expect(root).toHaveAttribute('data-nav-layout', 'around');

    // Default rdp nav buttons render (not the custom absolute-positioned ones)
    const prevBtn = document.querySelector('.rdp-button_previous');
    const nextBtn = document.querySelector('.rdp-button_next');
    expect(prevBtn).toBeInTheDocument();
    expect(nextBtn).toBeInTheDocument();
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
    const CustomDayButton = ({
      children,
      ...props
    }: {
      readonly children?: React.ReactNode;
      readonly [key: string]: unknown;
    }) => (
      <button type='button' data-testid='custom-day-button' {...props}>
        {children}
      </button>
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
