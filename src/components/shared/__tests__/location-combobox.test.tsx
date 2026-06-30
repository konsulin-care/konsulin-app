import LocationCombobox from '@/components/shared/location-combobox';
import { render, screen } from '@testing-library/react';
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
});
