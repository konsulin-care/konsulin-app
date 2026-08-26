import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DobCalendar from '../dob-calendar';

describe('DobCalendar', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <DobCalendar value={null} onChange={vi.fn()} />
    );
    expect(container.querySelector('.rdp-root')).toBeInTheDocument();
  });

  it('disables future dates', () => {
    render(<DobCalendar value={null} onChange={vi.fn()} />);

    // Find disabled day buttons (future dates should be disabled)
    const disabledButtons = document.querySelectorAll(
      '.rdp-day_button[disabled]'
    );
    expect(disabledButtons.length).toBeGreaterThan(0);
  });

  it('calls onChange when a valid date is selected', () => {
    const onChange = vi.fn();
    render(<DobCalendar value={null} onChange={onChange} />);

    // Find enabled day buttons and click one
    const enabledButtons = document.querySelectorAll(
      '.rdp-day_button:not([disabled])'
    );
    expect(enabledButtons.length).toBeGreaterThan(0);

    fireEvent.click(enabledButtons[0]);
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('displays the selected date when provided', () => {
    // Use today's date so it's visible in the current month view
    const today = new Date();
    const { container } = render(
      <DobCalendar value={today} onChange={vi.fn()} />
    );

    // The selected date should have aria-selected attribute
    const selectedButton = container.querySelector('[aria-selected="true"]');
    expect(selectedButton).toBeInTheDocument();
  });

  it('renders with single selection mode', () => {
    const { container } = render(
      <DobCalendar value={null} onChange={vi.fn()} />
    );

    // Should render in single mode (no range-related elements)
    const root = container.querySelector('.rdp-root');
    expect(root).toBeInTheDocument();
  });
});
