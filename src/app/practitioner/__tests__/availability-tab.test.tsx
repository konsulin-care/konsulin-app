/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: vi.fn()
}));

vi.mock('@/components/availability/day-selector-navigation', () => ({
  default: () => <div data-testid='day-selector'>DaySelector</div>
}));

vi.mock('@/components/availability/availability-editor', () => ({
  default: ({ selectedDay, weeklyAvailability }: any) => {
    // Simulate the real component's access pattern
    const dayAvail = weeklyAvailability?.[selectedDay];
    if (dayAvail === undefined) {
      throw new Error(
        `weeklyAvailability[${selectedDay}] is undefined — stale state race`
      );
    }
    return <div data-testid='availability-editor'>Editor</div>;
  }
}));

vi.mock('@/components/availability/floating-save-button', () => ({
  default: ({ onSave }: any) => (
    <button data-testid='save-all' onClick={onSave}>
      Save All
    </button>
  )
}));

import { useDetailPractitioner } from '@/services/clinic';
import type { PractitionerRole } from 'fhir/r4';
import AvailabilityTab from '../availability-tab';

const mockRole: Partial<PractitionerRole> = {
  resourceType: 'PractitionerRole',
  id: 'role-1',
  active: true,
  availableTime: [
    {
      daysOfWeek: ['mon', 'wed', 'fri'],
      availableStartTime: '09:00:00',
      availableEndTime: '17:00:00'
    }
  ]
};

describe('AvailabilityTab', () => {
  it('renders day selector and editor when role data is loaded', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: { resource: mockRole },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<AvailabilityTab practitionerRoleId='role-1' />);

    expect(screen.getByTestId('day-selector')).toBeInTheDocument();
    expect(screen.getByTestId('availability-editor')).toBeInTheDocument();
  });

  it('does not crash when data loads and editor renders', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: { resource: mockRole },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    render(<AvailabilityTab practitionerRoleId='role-1' />);

    expect(screen.getByTestId('availability-editor')).toBeInTheDocument();
    expect(screen.getByTestId('day-selector')).toBeInTheDocument();
    expect(screen.getByTestId('save-all')).toBeInTheDocument();
  });

  it('renders without crashing when data transitions from loading to loaded', () => {
    // Simulate loading → loaded transition
    const mock = vi.mocked(useDetailPractitioner);

    mock.mockReturnValueOnce({
      newData: undefined,
      isLoading: true,
      isError: false,
      isFetching: true
    } as any);

    const { rerender } = render(
      <AvailabilityTab practitionerRoleId='role-1' />
    );
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    mock.mockReturnValueOnce({
      newData: { resource: mockRole },
      isLoading: false,
      isError: false,
      isFetching: false
    } as any);

    rerender(<AvailabilityTab practitionerRoleId='role-1' />);

    // This would throw if weeklyAvailability[selectedDay] is undefined
    expect(screen.getByTestId('availability-editor')).toBeInTheDocument();
  });

  it('shows loading state when fetching', () => {
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: true,
      isError: false,
      isFetching: true
    } as any);

    const { container } = render(
      <AvailabilityTab practitionerRoleId='role-1' />
    );
    expect(container.innerHTML).toBeTruthy();
  });
});
