import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/ui/app-drawer', () => ({
  default: ({
    children,
    open,
    onClose,
    title
  }: {
    children: React.ReactNode;
    open: boolean;
    onClose: () => void;
    title?: string;
  }) => (
    <div data-testid='drawer-root' data-open={open}>
      {title && <div data-testid='drawer-title'>{title}</div>}
      {open && children}
    </div>
  )
}));

vi.mock('@/components/ui/calendar-base', () => ({
  CalendarBase: ({
    mode,
    onSelect
  }: {
    mode: string;
    onSelect?: (date: unknown) => void;
  }) => (
    <div data-testid='calendar-base' data-mode={mode}>
      <button type='button' onClick={() => onSelect?.(new Date('2026-03-15'))}>
        Select Mar 15
      </button>
    </div>
  )
}));

import DatePickerButton from '../date-picker-button';

describe('DatePickerButton', () => {
  it('renders placeholder when no value is provided', () => {
    render(<DatePickerButton value={undefined} onChange={vi.fn()} />);
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
  });

  it('renders custom placeholder text', () => {
    render(
      <DatePickerButton
        value={undefined}
        onChange={vi.fn()}
        placeholder='Select start date'
      />
    );
    expect(screen.getByText('Select start date')).toBeInTheDocument();
  });

  it('renders formatted date when value is provided', () => {
    render(
      <DatePickerButton value={new Date('2026-03-15')} onChange={vi.fn()} />
    );
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument();
  });

  it('opens drawer when button is clicked', () => {
    render(<DatePickerButton value={undefined} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByTestId('drawer-root')).toHaveAttribute(
      'data-open',
      'true'
    );
  });

  it('closes drawer and calls onChange when a date is selected', () => {
    const onChange = vi.fn();
    render(<DatePickerButton value={undefined} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    fireEvent.click(screen.getByText('Select Mar 15'));
    expect(onChange).toHaveBeenCalledWith(new Date('2026-03-15'));
  });

  it('renders calendar in single mode', () => {
    render(<DatePickerButton value={undefined} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByTestId('calendar-base')).toHaveAttribute(
      'data-mode',
      'single'
    );
  });

  it('disables the button when disabled prop is true', () => {
    render(<DatePickerButton value={undefined} onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: /pick a date/i })).toBeDisabled();
  });

  it('does not open drawer when disabled button is clicked', () => {
    render(<DatePickerButton value={undefined} onChange={vi.fn()} disabled />);
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    expect(screen.getByTestId('drawer-root')).toHaveAttribute(
      'data-open',
      'false'
    );
  });
});

describe('DatePickerButton - controlled state', () => {
  function ControlledHarness() {
    const [date, setDate] = useState<Date | undefined>(undefined);
    return (
      <div>
        <DatePickerButton value={date} onChange={setDate} />
        {date && <span data-testid='selected-date'>{date.toISOString()}</span>}
      </div>
    );
  }

  it('updates the displayed date after selection', () => {
    render(<ControlledHarness />);
    expect(screen.getByText('Pick a date')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /pick a date/i }));
    fireEvent.click(screen.getByText('Select Mar 15'));
    expect(screen.getByText('15 Mar 2026')).toBeInTheDocument();
  });
});
