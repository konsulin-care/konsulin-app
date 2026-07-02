import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import PatientAvailability from '../patient-availability';

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: vi.fn()
}));

vi.mock('@/services/clinicians', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/clinicians')>();
  return {
    ...actual,
    usePractitionerSlots: vi.fn()
  };
});

vi.mock('@/components/ui/calendar-temp', () => ({
  Calendar: ({
    mode,
    disabled,
    onSelect
  }: {
    mode: string;
    disabled: (date: Date) => boolean;
    onSelect: (date?: Date) => void;
  }) => (
    <div data-testid='mock-calendar'>
      <button
        data-testid='calendar-select-date'
        onClick={() => onSelect(new Date('2026-07-03'))}
      >
        Select Date
      </button>
      <span data-testid='disabled-today'>
        {disabled(new Date('2026-06-01')) ? 'past-disabled' : 'past-enabled'}
      </span>
    </div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: () => <div data-testid='loading-spinner'>Loading</div>
}));

import {
  useDetailPractitioner
} from '@/services/clinic';
import { usePractitionerSlots } from '@/services/clinicians';

const mockUseDetailPractitioner = vi.mocked(useDetailPractitioner);
const mockUsePractitionerSlots = vi.mocked(usePractitionerSlots);

describe('PatientAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseDetailPractitioner.mockReturnValue({
      newData: {
        resource: {
          id: 'role-123',
          availableTime: [
            {
              daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'] as const,
              availableStartTime: '09:00',
              availableEndTime: '17:00'
            }
          ]
        },
        organization: { name: 'Jakarta Clinic' }
      },
      isLoading: false,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    mockUsePractitionerSlots.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    } as unknown as ReturnType<typeof usePractitionerSlots>);
  });

  it('renders calendar', () => {
    render(<PatientAvailability practitionerRoleId='role-123' />);
    expect(screen.getByTestId('mock-calendar')).toBeInTheDocument();
  });

  it('shows free slots after selecting a date', async () => {
    render(<PatientAvailability practitionerRoleId='role-123' />);

    // Initially shows prompt
    expect(screen.getByText('Select a date to see available times')).toBeInTheDocument();

    // Click the date-select button in the mock calendar
    fireEvent.click(screen.getByTestId('calendar-select-date'));

    // With no busy slots, full day should be available
    // 09-10, 10-11, 11-12, 12-13, 13-14, 14-15, 15-16, 16-17
    expect(screen.getByText('09:00 - 10:00')).toBeInTheDocument();
    expect(screen.getByText('10:00 - 11:00')).toBeInTheDocument();
    expect(screen.getByText('16:00 - 17:00')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    mockUseDetailPractitioner.mockReturnValue({
      newData: undefined,
      isLoading: true,
      isError: false,
      isFetching: false
    } as unknown as ReturnType<typeof useDetailPractitioner>);

    render(<PatientAvailability practitionerRoleId='role-123' />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });
});
