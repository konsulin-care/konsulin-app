import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DobInput from '../dob-input';

describe('DobInput', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders three selects: Day, Month, Year', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Day' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Year' })).toBeInTheDocument();
  });

  it('shows placeholder options when value is empty', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    expect(screen.getByRole('option', { name: 'DD' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'YYYY' })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Parsing incoming value
  // ---------------------------------------------------------------------------

  it('parses incoming yyyy-MM-dd and selects correct day, month, year', () => {
    render(<DobInput value='1990-03-12' onChange={vi.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveValue('12');
    expect(screen.getByRole('combobox', { name: 'Month' })).toHaveValue(
      'March'
    );
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('1990');
  });

  // ---------------------------------------------------------------------------
  // Selection and onChange emission
  // ---------------------------------------------------------------------------

  it.each([
    { field: 'Day', initial: '1990-03-01', next: '5', expected: '1990-03-05' },
    {
      field: 'Month',
      initial: '1990-01-12',
      next: 'June',
      expected: '1990-06-12'
    },
    {
      field: 'Year',
      initial: '2000-03-12',
      next: '1995',
      expected: '1995-03-12'
    }
  ])(
    'emits yyyy-MM-dd when $field is selected',
    ({ field, initial, next, expected }) => {
      const onChange = vi.fn();
      render(<DobInput value={initial} onChange={onChange} />);

      fireEvent.change(screen.getByRole('combobox', { name: field }), {
        target: { value: next }
      });

      expect(onChange).toHaveBeenCalledWith(expected);
    }
  );

  // ---------------------------------------------------------------------------
  // Day clamping when month or year changes
  // ---------------------------------------------------------------------------

  // ---------------------------------------------------------------------------
  // Syncing from external value
  // ---------------------------------------------------------------------------

  it('clears selects when value changes from valid date to empty string', () => {
    const { rerender } = render(
      <DobInput value='1990-03-12' onChange={vi.fn()} />
    );
    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveValue('12');

    rerender(<DobInput value='' onChange={vi.fn()} />);

    expect(screen.getByRole('combobox', { name: 'Day' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'DD' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Month' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Month' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Year' })).toHaveValue('');
    expect(screen.getByRole('option', { name: 'YYYY' })).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Day clamping when month or year changes
  // ---------------------------------------------------------------------------

  it.each([
    {
      note: 'Jan 31 -> Feb in 2023 (non-leap) clamps to 28',
      initial: '2023-01-31',
      field: 'Month',
      next: 'February',
      expected: '2023-02-28'
    },
    {
      note: 'Jan 31 -> Feb in 2024 (leap) clamps to 29',
      initial: '2024-01-31',
      field: 'Month',
      next: 'February',
      expected: '2024-02-29'
    },
    {
      note: 'Feb 29 in 2024 -> 2023 (non-leap) clamps to 28',
      initial: '2024-02-29',
      field: 'Year',
      next: '2023',
      expected: '2023-02-28'
    },
    {
      note: 'day 15 survives switching to March (31 days)',
      initial: '2023-01-15',
      field: 'Month',
      next: 'March',
      expected: '2023-03-15'
    }
  ])('clamps day: $note', ({ initial, field, next, expected }) => {
    const onChange = vi.fn();
    render(<DobInput value={initial} onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: field }), {
      target: { value: next }
    });

    expect(onChange).toHaveBeenCalledWith(expected);
  });
});
