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
          loading={true}
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
        loading={true}
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
});
