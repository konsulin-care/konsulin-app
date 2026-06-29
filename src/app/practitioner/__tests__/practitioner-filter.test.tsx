/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */

import { fireEvent, render, screen } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerFilter from '../practitioner-filter';

// Mock UI components used by the filter
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open, onOpenChange }: any) => (
    <div data-testid='popover' data-open={open}>
      {typeof children === 'function'
        ? children({ open, onOpenChange })
        : children}
    </div>
  ),
  PopoverContent: ({ children }: any) => (
    <div data-testid='popover-content'>{children}</div>
  ),
  PopoverTrigger: ({ children, asChild }: any) =>
    asChild ? (
      (children as ReactNode)
    ) : (
      <div data-testid='popover-trigger'>{children}</div>
    )
}));

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
  CommandItem: ({ children, onSelect, value }: any) => (
    <button
      data-testid={`command-item-${value}`}
      onClick={() => onSelect(value)}
    >
      {children}
    </button>
  ),
  CommandList: ({ children }: any) => (
    <div data-testid='command-list'>{children}</div>
  )
}));

vi.mock('@/components/ui/toggle-group', () => ({
  ToggleGroup: ({ children, value, onValueChange, type }: any) => {
    if (type !== 'single') throw new Error('Expected type="single"');
    return (
      <div
        data-testid='toggle-group'
        data-value={value}
        onClickCapture={(e: any) => {
          const el = (e.target as HTMLElement).closest('[data-status]');
          if (el instanceof HTMLElement && el.dataset.status) {
            onValueChange(el.dataset.status);
          }
        }}
      >
        {children}
      </div>
    );
  },
  ToggleGroupItem: ({ children, value: itemValue }: any) => (
    <button data-testid={`toggle-${itemValue}`} data-status={itemValue}>
      {children}
    </button>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className, onClick }: any) => (
    <span data-testid='badge' className={className} onClick={onClick}>
      {children}
    </span>
  )
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, className, ...props }: any) => (
    <button
      data-testid='filter-button'
      onClick={onClick}
      data-variant={variant}
      className={className}
      {...props}
    >
      {children}
    </button>
  )
}));

vi.mock('@/components/icons', () => ({
  FilterIcon: (props: any) => <svg data-testid='filter-icon' {...props} />,
  LoadingSpinnerIcon: (props: any) => (
    <svg data-testid='loading-spinner-icon' {...props} />
  )
}));

const defaultLocations = [
  { id: 'loc-1', name: 'Main Clinic' },
  { id: 'loc-2', name: 'Branch A' }
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PractitionerFilter', () => {
  it('renders filter button with badge showing active filter count', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'active', locationId: 'loc-1' }}
        onChange={onChange}
      />
    );

    // Badge should show 2 (status + location)
    expect(screen.getByText('2')).toBeDefined();
    expect(screen.getByTestId('filter-icon')).toBeDefined();
  });

  it('shows no badge when no filters are applied (status=all, no location)', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'all' }}
        onChange={onChange}
      />
    );

    // No badge when state is default
    expect(screen.queryByTestId('badge')).toBeNull();
  });

  it('shows active filter chips when filters are applied', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'active', locationId: 'loc-1' }}
        onChange={onChange}
      />
    );

    const badges = screen.getAllByTestId('badge');
    const badgeTexts = badges.map(b => b.textContent);
    expect(badgeTexts.some(t => t?.includes('Active'))).toBe(true);
    expect(badgeTexts.some(t => t?.includes('Main Clinic'))).toBe(true);
  });

  it('shows no chips when no filters are applied', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'all' }}
        onChange={onChange}
      />
    );

    const badges = screen.queryAllByTestId('badge');
    expect(badges.length).toBe(0);
  });

  it('opens popover with toggle group for status', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'all' }}
        onChange={onChange}
      />
    );

    // All status is the default — button text should show "All"
    expect(screen.getByTestId('toggle-all')).toBeDefined();
    expect(screen.getByTestId('toggle-active')).toBeDefined();
    expect(screen.getByTestId('toggle-inactive')).toBeDefined();
  });

  it('calls onChange when a status is selected', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'all' }}
        onChange={onChange}
      />
    );

    // Click on the Active toggle
    fireEvent.click(screen.getByTestId('toggle-active'));

    expect(onChange).toHaveBeenCalledWith({ status: 'active' });
  });

  it('calls onChange when a location is selected from combobox', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'all' }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByTestId('command-item-loc-1'));

    expect(onChange).toHaveBeenCalledWith({
      status: 'all',
      locationId: 'loc-1'
    });
  });

  it('dismisses a filter chip and calls onChange with cleared value', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'active', locationId: 'loc-1' }}
        onChange={onChange}
      />
    );

    // Find the status chip's close button (the "×" is rendered as part of the badge)
    const badges = screen.getAllByTestId('badge');
    // First badge: status "Active", second: location "Main Clinic"
    fireEvent.click(badges[0]);

    // Should call onChange with status reset to 'all'
    expect(onChange).toHaveBeenCalledWith({
      status: 'all',
      locationId: 'loc-1'
    });
  });

  it('reset button clears all filters', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'inactive', locationId: 'loc-2' }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByText('Reset filters'));

    expect(onChange).toHaveBeenCalledWith({ status: 'all' });
  });

  it('shows location name in chip when location filter is applied', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'all', locationId: 'loc-2' }}
        onChange={onChange}
      />
    );

    expect(screen.getByText('Branch A')).toBeDefined();
  });

  it('shows "Unknown location" in chip when locationId not in list', () => {
    const onChange = vi.fn();
    render(
      <PractitionerFilter
        locations={defaultLocations}
        value={{ status: 'all', locationId: 'unknown-id' }}
        onChange={onChange}
      />
    );

    const badge = screen.getByTestId('badge');
    expect(badge.textContent).toContain('Unknown location');
  });
});
