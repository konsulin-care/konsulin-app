import RecordFilter from '@/app/record/record-filter';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('RecordFilter', () => {
  it('renders filter trigger button', () => {
    render(<RecordFilter onChange={vi.fn()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('opens drawer when trigger is clicked', async () => {
    render(<RecordFilter onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Filter & Sort')).toBeInTheDocument();
    });
  });

  it('calls onChange only when Apply is pressed', async () => {
    const onChange = vi.fn();
    render(<RecordFilter onChange={onChange} />);

    // Open drawer
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Filter & Sort')).toBeInTheDocument();
    });

    // Click Apply button
    const applyButton = screen.getByText('Terapkan Filter');
    fireEvent.click(applyButton);

    // onChange should be called exactly once (by Apply, not by outside click)
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('shows multi-select combobox for record types', async () => {
    render(<RecordFilter onChange={vi.fn()} />);

    // Open drawer
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Show By')).toBeInTheDocument();
    });

    // The combobox should be present with placeholder
    const combobox = screen.getByRole('combobox');
    expect(combobox).toBeInTheDocument();
    expect(combobox.textContent).toContain('All types');
  });
});
