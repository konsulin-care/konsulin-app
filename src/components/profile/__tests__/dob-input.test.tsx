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

  it('emits yyyy-MM-dd when a day is selected', () => {
    const onChange = vi.fn();
    render(<DobInput value='1990-03-01' onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Day' }), {
      target: { value: '5' }
    });

    expect(onChange).toHaveBeenCalledWith('1990-03-05');
  });

  it('emits yyyy-MM-dd when a month is selected', () => {
    const onChange = vi.fn();
    render(<DobInput value='1990-01-12' onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Month' }), {
      target: { value: 'June' }
    });

    expect(onChange).toHaveBeenCalledWith('1990-06-12');
  });

  it('emits yyyy-MM-dd when a year is selected', () => {
    const onChange = vi.fn();
    render(<DobInput value='2000-03-12' onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Year' }), {
      target: { value: '1995' }
    });

    expect(onChange).toHaveBeenCalledWith('1995-03-12');
  });

  // ---------------------------------------------------------------------------
  // Day clamping when month changes
  // ---------------------------------------------------------------------------

  it('clamps day from 31 to 28 when switching Jan -> Feb (non-leap year)', () => {
    const onChange = vi.fn();
    render(<DobInput value='2023-01-31' onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Month' }), {
      target: { value: 'February' }
    });

    // 2023 is not a leap year, so Feb has 28 days -> clamped to 28
    expect(onChange).toHaveBeenCalledWith('2023-02-28');
  });

  it('clamps day from 31 to 29 when switching Jan -> Feb (leap year)', () => {
    const onChange = vi.fn();
    render(<DobInput value='2024-01-31' onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Month' }), {
      target: { value: 'February' }
    });

    // 2024 is a leap year, so Feb has 29 days -> clamped to 29
    expect(onChange).toHaveBeenCalledWith('2024-02-29');
  });

  // ---------------------------------------------------------------------------
  // Day clamping when year changes
  // ---------------------------------------------------------------------------

  it('clamps day from 29 to 28 when switching 2024 (leap) -> 2023 (non-leap) for Feb', () => {
    const onChange = vi.fn();
    render(<DobInput value='2024-02-29' onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Year' }), {
      target: { value: '2023' }
    });

    // 2023 Feb has 28 days -> clamped to 28
    expect(onChange).toHaveBeenCalledWith('2023-02-28');
  });

  it('does not clamp day when new month has enough days', () => {
    const onChange = vi.fn();
    render(<DobInput value='2023-01-15' onChange={onChange} />);

    fireEvent.change(screen.getByRole('combobox', { name: 'Month' }), {
      target: { value: 'March' }
    });

    // Mar has 31 days, day 15 is fine
    expect(onChange).toHaveBeenCalledWith('2023-03-15');
  });
});
