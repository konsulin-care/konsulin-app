/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: any) => <div data-testid='command'>{children}</div>,
  CommandEmpty: ({ children }: any) => (
    <div data-testid='command-empty'>{children}</div>
  ),
  CommandGroup: ({ children }: any) => (
    <div data-testid='command-group'>{children}</div>
  ),
  CommandInput: ({ placeholder }: any) => (
    <input data-testid='command-input' placeholder={placeholder} />
  ),
  CommandItem: ({ children, onSelect }: any) => (
    <button data-testid='command-item' onClick={onSelect}>
      {children}
    </button>
  ),
  CommandList: ({ children }: any) => (
    <div data-testid='command-list'>{children}</div>
  )
}));

import PractitionerLocationCombobox from '../practitioner-location-combobox';

const defaultLocations = [
  { id: 'loc-1', name: 'RSCJ' },
  { id: 'loc-2', name: 'RSUD' },
  { id: 'loc-3', name: 'Klinik Pratama' }
];

describe('PractitionerLocationCombobox', () => {
  it('renders placeholder when no location selected', () => {
    render(
      <PractitionerLocationCombobox
        locations={defaultLocations}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Select location...'
    );
  });

  it('renders selected location name', () => {
    render(
      <PractitionerLocationCombobox
        locations={defaultLocations}
        selectedId='loc-1'
        onSelect={vi.fn()}
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent('RSCJ');
  });

  it('opens popover and shows locations when clicked', () => {
    render(
      <PractitionerLocationCombobox
        locations={defaultLocations}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByTestId('command-input')).toBeInTheDocument();
    expect(screen.getByText('RSCJ')).toBeInTheDocument();
    expect(screen.getByText('RSUD')).toBeInTheDocument();
    expect(screen.getByText('Klinik Pratama')).toBeInTheDocument();
  });

  it('calls onSelect when location is clicked', () => {
    const onSelect = vi.fn();
    render(
      <PractitionerLocationCombobox
        locations={defaultLocations}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    fireEvent.click(screen.getByText('RSCJ'));

    expect(onSelect).toHaveBeenCalledWith('loc-1');
  });

  it('shows loading state', () => {
    render(
      <PractitionerLocationCombobox
        locations={[]}
        selectedId={null}
        onSelect={vi.fn()}
        loading
      />
    );

    expect(screen.getByRole('combobox')).toBeDisabled();
    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows custom placeholder', () => {
    render(
      <PractitionerLocationCombobox
        locations={defaultLocations}
        selectedId={null}
        onSelect={vi.fn()}
        placeholder='Choose location...'
      />
    );

    expect(screen.getByRole('combobox')).toHaveTextContent(
      'Choose location...'
    );
  });

  it('shows empty state when no locations', () => {
    render(
      <PractitionerLocationCombobox
        locations={[]}
        selectedId={null}
        onSelect={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('combobox'));
    expect(screen.getByText('No locations found')).toBeInTheDocument();
  });
});
