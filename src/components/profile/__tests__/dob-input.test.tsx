import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DobInput from '../dob-input';

describe('DobInput', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  it('renders three comboboxes: Day, Month, Year', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes).toHaveLength(3);
  });

  it('shows placeholders when value is empty', () => {
    render(<DobInput value='' onChange={vi.fn()} />);
    expect(screen.getByText('DD')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('YYYY')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Parsing incoming value
  // ---------------------------------------------------------------------------

  it('parses incoming yyyy-MM-dd and displays correct day, month, year', () => {
    render(<DobInput value='1990-03-12' onChange={vi.fn()} />);
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Mar')).toBeInTheDocument();
    expect(screen.getByText('1990')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Selection and onChange emission
  // ---------------------------------------------------------------------------

  it('emits yyyy-MM-dd when a day is selected', async () => {
    const onChange = vi.fn();
    render(<DobInput value='1990-03-01' onChange={onChange} />);

    // Open Day combobox (first combobox)
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[0]);

    // Wait for popover and click day "5"
    await waitFor(() => {
      expect(screen.getByRole('option', { name: '5' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: '5' }));

    expect(onChange).toHaveBeenCalledWith('1990-03-05');
  });

  it('emits yyyy-MM-dd when a month is selected', async () => {
    const onChange = vi.fn();
    render(<DobInput value='1990-01-12' onChange={onChange} />);

    // Open Month combobox (second combobox)
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[1]);

    // Wait for popover and click "Jun"
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Jun' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Jun' }));

    expect(onChange).toHaveBeenCalledWith('1990-06-12');
  });

  it('emits yyyy-MM-dd when a year is selected', async () => {
    const onChange = vi.fn();
    render(<DobInput value='2000-03-12' onChange={onChange} />);

    // Open Year combobox (third combobox)
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[2]);

    // Wait for popover and click "1995"
    await waitFor(() => {
      expect(screen.getByRole('option', { name: '1995' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: '1995' }));

    expect(onChange).toHaveBeenCalledWith('1995-03-12');
  });

  // ---------------------------------------------------------------------------
  // Filtering via typing
  // ---------------------------------------------------------------------------

  it('filters month items when typing in the search input', async () => {
    render(<DobInput value='' onChange={vi.fn()} />);

    // Open Month combobox
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[1]);

    // Type "Feb" to filter
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument();
    });
    const input = screen.getByPlaceholderText('Search...');
    fireEvent.change(input, { target: { value: 'Feb' } });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Feb' })).toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: 'Jan' })
      ).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Day clamping when month changes
  // ---------------------------------------------------------------------------

  it('clamps day from 31 to 28 when switching Jan -> Feb (non-leap year)', async () => {
    const onChange = vi.fn();
    render(<DobInput value='2023-01-31' onChange={onChange} />);

    // Open Month combobox and select Feb
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[1]);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Feb' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Feb' }));

    // 2023 is not a leap year, so Feb has 28 days -> clamped to 28
    expect(onChange).toHaveBeenCalledWith('2023-02-28');
  });

  it('clamps day from 31 to 29 when switching Jan -> Feb (leap year)', async () => {
    const onChange = vi.fn();
    render(<DobInput value='2024-01-31' onChange={onChange} />);

    // Open Month combobox and select Feb
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[1]);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Feb' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Feb' }));

    // 2024 is a leap year, so Feb has 29 days -> clamped to 29
    expect(onChange).toHaveBeenCalledWith('2024-02-29');
  });

  // ---------------------------------------------------------------------------
  // Day clamping when year changes
  // ---------------------------------------------------------------------------

  it('clamps day from 29 to 28 when switching 2024 (leap) -> 2023 (non-leap) for Feb', async () => {
    const onChange = vi.fn();
    render(<DobInput value='2024-02-29' onChange={onChange} />);

    // Open Year combobox and select 2023
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[2]);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: '2023' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: '2023' }));

    // 2023 Feb has 28 days -> clamped to 28
    expect(onChange).toHaveBeenCalledWith('2023-02-28');
  });

  it('does not clamp day when new month has enough days', async () => {
    const onChange = vi.fn();
    render(<DobInput value='2023-01-15' onChange={onChange} />);

    // Open Month combobox and select Mar
    const comboboxes = screen.getAllByRole('combobox');
    fireEvent.click(comboboxes[1]);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Mar' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('option', { name: 'Mar' }));

    // Mar has 31 days, day 15 is fine
    expect(onChange).toHaveBeenCalledWith('2023-03-15');
  });
});
