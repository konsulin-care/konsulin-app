import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Combobox, { type ComboboxOption } from '../combobox';

const OPTIONS: readonly ComboboxOption[] = [
  { code: 'a', name: 'Option A' },
  { code: 'b', name: 'Option B' }
];

describe('Combobox renderOptionLabel', () => {
  it('renders default name when renderOptionLabel is not provided', async () => {
    render(
      <Combobox
        options={OPTIONS}
        value=''
        onSelect={vi.fn()}
        placeholder='Select items'
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
    });
  });

  it('renders custom content via renderOptionLabel', async () => {
    render(
      <Combobox
        options={OPTIONS}
        value=''
        onSelect={vi.fn()}
        placeholder='Select items'
        renderOptionLabel={option => (
          <div data-testid={`custom-${option.code}`}>
            <span>{option.name}</span>
            <span>Custom metadata</span>
          </div>
        )}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      expect(screen.getByTestId('custom-a')).toBeInTheDocument();
      expect(screen.getByTestId('custom-b')).toBeInTheDocument();
      expect(screen.getAllByText('Custom metadata')).toHaveLength(2);
    });
  });

  it('keeps checkbox rendering in multi-select mode with renderOptionLabel', async () => {
    const onSelect = vi.fn();
    render(
      <Combobox
        multiple
        options={OPTIONS}
        value={[]}
        onSelect={onSelect}
        placeholder='Select items'
        renderOptionLabel={option => <span>{option.name} - extra</span>}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(await waitFor(() => screen.getByText('Option A - extra')));

    expect(onSelect).toHaveBeenCalledWith(['a']);
  });

  it('keeps checkmark rendering in single-select mode with renderOptionLabel', async () => {
    render(
      <Combobox
        options={OPTIONS}
        value='a'
        onSelect={vi.fn()}
        placeholder='Select items'
        renderOptionLabel={option => <span>{option.name} - extra</span>}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    await waitFor(() => {
      // Checkmark icon should be present for selected item
      const checkmarks = document.querySelectorAll('svg.lucide-check');
      expect(checkmarks.length).toBeGreaterThanOrEqual(1);
    });
  });
});
