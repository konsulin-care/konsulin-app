import LocationCombobox from '@/components/shared/location-combobox';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

describe('LocationCombobox', () => {
  it('renders without crashing when options is undefined', () => {
    expect(() =>
      render(
        <LocationCombobox
          options={undefined as unknown as []}
          value=''
          onSelect={vi.fn()}
          placeholder='Select province'
        />
      )
    ).not.toThrow();
  });

  it('renders without crashing when options is undefined and loading is true', () => {
    expect(() =>
      render(
        <LocationCombobox
          options={undefined as unknown as []}
          value=''
          onSelect={vi.fn()}
          placeholder='Select province'
          loading
        />
      )
    ).not.toThrow();
  });

  it('renders placeholder text when no option is selected', () => {
    render(
      <LocationCombobox
        options={[]}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
      />
    );

    expect(screen.getByText('Select province')).toBeInTheDocument();
  });

  it('renders loading state when loading is true', () => {
    render(
      <LocationCombobox
        options={[]}
        value=''
        onSelect={vi.fn()}
        placeholder='Select province'
        loading
      />
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('filters by name when typing in the search input', async () => {
    render(
      <LocationCombobox
        options={[
          { code: '3173', name: 'Jakarta' },
          { code: '3201', name: 'Bogor' },
          { code: '3273', name: 'Bandung' }
        ]}
        value=''
        onSelect={vi.fn()}
        placeholder='Select city'
      />
    );

    // Open the popover
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);

    // All options visible when popover opens
    await waitFor(() => {
      expect(screen.getByText('Jakarta')).toBeInTheDocument();
      expect(screen.getByText('Bogor')).toBeInTheDocument();
      expect(screen.getByText('Bandung')).toBeInTheDocument();
    });

    // Type a name substring — should filter by name, not code "3173"
    const input = screen.getByPlaceholderText('Select city');
    fireEvent.change(input, { target: { value: 'Jak' } });

    await waitFor(() => {
      // "Jakarta" matches "Jak" — should be visible
      expect(screen.getByText('Jakarta')).toBeInTheDocument();
    });

    // Typing a code substring should NOT match — "3173" doesn't resolve to a name
    fireEvent.change(input, { target: { value: '3173' } });

    await waitFor(() => {
      // When no results match, cmdk shows the Empty message
      expect(screen.getByText('No results found.')).toBeInTheDocument();
    });
  });

  it('shows selected option name on trigger button', () => {
    render(
      <LocationCombobox
        options={[
          { code: '3173', name: 'Jakarta' },
          { code: '3201', name: 'Bogor' }
        ]}
        value='3173'
        onSelect={vi.fn()}
        placeholder='Select city'
      />
    );

    expect(screen.getByText('Jakarta')).toBeInTheDocument();
  });

  describe('multi-select mode', () => {
    it('renders checkboxes when multiple=true', async () => {
      render(
        <LocationCombobox
          multiple
          options={[
            { code: 'a', name: 'Option A' },
            { code: 'b', name: 'Option B' }
          ]}
          value={[]}
          onSelect={vi.fn()}
          placeholder='Select items'
        />
      );

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Option A')).toBeInTheDocument();
        expect(screen.getByText('Option B')).toBeInTheDocument();
      });

      // Checkboxes should be present
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(2);
    });

    it('toggles values in array without closing popover on select', async () => {
      const onSelect = vi.fn();
      render(
        <LocationCombobox
          multiple
          options={[
            { code: 'a', name: 'Option A' },
            { code: 'b', name: 'Option B' }
          ]}
          value={[]}
          onSelect={onSelect}
          placeholder='Select items'
        />
      );

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Option A')).toBeInTheDocument();
      });

      // Click first option
      fireEvent.click(screen.getByText('Option A'));

      // Should call onSelect with ['a']
      expect(onSelect).toHaveBeenCalledWith(['a']);

      // Popover should still be open — Option B is still visible
      expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('deselects a value when clicking an already-selected item', async () => {
      const onSelect = vi.fn();
      render(
        <LocationCombobox
          multiple
          options={[
            { code: 'a', name: 'Option A' },
            { code: 'b', name: 'Option B' }
          ]}
          value={['a', 'b']}
          onSelect={onSelect}
          placeholder='Select items'
        />
      );

      const trigger = screen.getByRole('combobox');
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Option A')).toBeInTheDocument();
      });

      // Click already-selected option A
      fireEvent.click(screen.getByText('Option A'));

      // Should call onSelect with ['b'] (removed 'a')
      expect(onSelect).toHaveBeenCalledWith(['b']);
    });

    it('shows comma-separated labels in trigger for multi-select', () => {
      render(
        <LocationCombobox
          multiple
          options={[
            { code: 'a', name: 'Option A' },
            { code: 'b', name: 'Option B' },
            { code: 'c', name: 'Option C' }
          ]}
          value={['a', 'c']}
          onSelect={vi.fn()}
          placeholder='Select items'
        />
      );

      const trigger = screen.getByRole('combobox');
      expect(trigger.textContent).toContain('Option A');
      expect(trigger.textContent).toContain('Option C');
    });

    it('shows placeholder when no items selected in multi-select mode', () => {
      render(
        <LocationCombobox
          multiple
          options={[
            { code: 'a', name: 'Option A' },
            { code: 'b', name: 'Option B' }
          ]}
          value={[]}
          onSelect={vi.fn()}
          placeholder='Select items'
        />
      );

      expect(screen.getByText('Select items')).toBeInTheDocument();
    });
  });
});
