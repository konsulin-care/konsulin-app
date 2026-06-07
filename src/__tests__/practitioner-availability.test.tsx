/* eslint-disable @typescript-eslint/no-explicit-any, max-lines, react/display-name */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  QueryClient,
  QueryClientProvider,
  useQuery
} from '@tanstack/react-query';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/context/booking/bookingContext', () => ({
  useBooking: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/clinicians', () => ({
  useFindAvailability: vi.fn()
}));

vi.mock('@/services/api/appointments', () => ({
  useCreateAppointment: vi.fn(),
  usePayAppointment: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { tempBooking: 'temp_booking' },
  dbGet: vi.fn(),
  dbDelete: vi.fn()
}));

vi.mock('@/utils/redirect-intent', () => ({
  clearIntent: vi.fn(),
  getIntent: vi.fn(),
  saveIntent: vi.fn()
}));

vi.mock('@tanstack/react-query', async () => {
  const actual = await vi.importActual('@tanstack/react-query');
  return {
    ...actual,
    useQuery: vi.fn()
  };
});

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  useParams: vi.fn()
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, className, ...props }: any) => (
    <button
      data-testid='mock-button'
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
  buttonVariants: () => 'btn-variants-class'
}));

vi.mock('@/components/ui/calendar-temp', () => ({
  Calendar: ({ onSelect, onMonthChange }: any) => (
    <div data-testid='mock-calendar'>
      <button
        data-testid='calendar-date-btn'
        onClick={() => onSelect?.(new Date('2026-06-15'))}
      >
        Select Date
      </button>
      <button
        data-testid='calendar-month-btn'
        onClick={() => onMonthChange?.(new Date('2026-07-01'))}
      >
        Change Month
      </button>
    </div>
  )
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: any) => (
    <div data-testid='mock-drawer' data-open={open}>
      {children}
    </div>
  ),
  DrawerContent: ({ children }: any) => (
    <div data-testid='mock-drawer-content'>{children}</div>
  ),
  DrawerDescription: ({ children }: any) => (
    <div data-testid='mock-drawer-description'>{children}</div>
  ),
  DrawerTitle: ({ children }: any) => (
    <div data-testid='mock-drawer-title'>{children}</div>
  ),
  DrawerTrigger: ({ children }: any) => (
    <div data-testid='mock-drawer-trigger'>{children}</div>
  )
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => (
    <div data-testid='mock-select'>{children}</div>
  ),
  SelectContent: ({ children }: any) => (
    <div data-testid='mock-select-content'>{children}</div>
  ),
  SelectGroup: ({ children }: any) => (
    <div data-testid='mock-select-group'>{children}</div>
  ),
  SelectItem: ({ children }: any) => (
    <div data-testid='mock-select-item'>{children}</div>
  ),
  SelectTrigger: ({ children }: any) => (
    <div data-testid='mock-select-trigger'>{children}</div>
  ),
  SelectValue: ({ placeholder }: any) => (
    <span data-testid='mock-select-value'>{placeholder}</span>
  )
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value, onChange, placeholder, className }: any) => (
    <textarea
      data-testid='mock-textarea'
      value={value}
      placeholder={placeholder}
      className={className}
      onChange={onChange}
      readOnly
    />
  )
}));

vi.mock('@/components/general/empty-state', () => ({
  default: ({ title, subtitle }: any) => (
    <div data-testid='mock-empty-state'>
      <div>{title}</div>
      <div>{subtitle}</div>
    </div>
  )
}));

vi.mock('@/components/icons', () => ({
  LoadingSpinnerIcon: (props: any) => (
    <svg data-testid='mock-loading-spinner' {...props} />
  )
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: any[]) => args[0] || '',
  conjunction: (items: any[]) => (items ? items.join(', dan ') : '')
}));

import PractitionerAvailability from '@/app/practitioner/practitioner-availability';
import { useAuth } from '@/context/auth/authContext';
import { useBooking } from '@/context/booking/bookingContext';
import {
  useCreateAppointment,
  usePayAppointment
} from '@/services/api/appointments';
import { useFindAvailability } from '@/services/clinicians';
import { useParams, useRouter, useSearchParams } from 'next/navigation';

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

const mockPractitionerRole: any = {
  id: 'role-1',
  availableTime: [{ daysOfWeek: ['mon', 'wed', 'fri'] }],
  period: { start: '2026-01-01T00:00:00+07:00' }
};

const mockSlotEntry = (
  id: string,
  start: string,
  end: string,
  status = 'free'
) => ({
  resource: {
    resourceType: 'Slot',
    id,
    start,
    end,
    status
  }
});

describe('PractitionerAvailability', () => {
  let queryClient: QueryClient;
  let mockRouter: any;
  let mockSearchParams: any;
  let mockBookingState: any;
  let mockBookingDispatch: any;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    mockRouter = { push: vi.fn() };
    mockSearchParams = new URLSearchParams();
    mockBookingDispatch = vi.fn();
    mockBookingState = {
      date: new Date('2026-06-15'),
      startTime: null,
      hasUserChosenDate: false,
      isBookingSubmitted: false
    };

    vi.mocked(useRouter).mockReturnValue(mockRouter);
    vi.mocked(useSearchParams).mockReturnValue(mockSearchParams as any);
    vi.mocked(useParams).mockReturnValue({ practitionerId: 'test-1' });
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { fhirId: 'patient-1', userId: 'user-1' }
      },
      dispatch: vi.fn()
    });
    vi.mocked(useBooking).mockReturnValue({
      state: mockBookingState,
      dispatch: mockBookingDispatch
    });
    vi.mocked(useFindAvailability).mockReturnValue({
      data: [
        mockSlotEntry(
          'slot-1',
          '2026-06-15T09:00:00+07:00',
          '2026-06-15T09:30:00+07:00'
        )
      ],
      isLoading: false,
      isError: false
    } as any);
    vi.mocked(useCreateAppointment).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false
    } as any);
    vi.mocked(usePayAppointment).mockReturnValue({
      mutateAsync: vi.fn(),
      isLoading: false
    } as any);
    vi.mocked(useQuery as any).mockReturnValue({ data: null } as any);
  });

  afterEach(() => {
    queryClient.clear();
  });

  it('renders trigger children', () => {
    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div data-testid='trigger-child'>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    expect(screen.getByTestId('trigger-child')).toBeDefined();
    expect(screen.getByText('Book Now')).toBeDefined();
  });

  it('opens drawer when trigger is clicked', () => {
    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div data-testid='trigger-child'>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('trigger-child'));
    const drawers = screen.getAllByTestId('mock-drawer');
    const bookingDrawer = drawers[0];
    expect(bookingDrawer.dataset.open).toBe('true');
  });

  it('shows calendar inside drawer', () => {
    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('mock-drawer-trigger'));
    expect(screen.getByTestId('mock-calendar')).toBeDefined();
  });

  it('shows booking form when user is authenticated', () => {
    vi.mocked(useBooking).mockReturnValue({
      state: { ...mockBookingState, startTime: '09:00' },
      dispatch: mockBookingDispatch
    });
    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('mock-drawer-trigger'));
    expect(screen.getByTestId('mock-select')).toBeDefined();
    expect(screen.getByTestId('mock-textarea')).toBeDefined();
  });

  it('shows login button when user is not authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: { isAuthenticated: false, userInfo: null },
      dispatch: vi.fn()
    });

    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('mock-drawer-trigger'));
    expect(screen.getByText(/Silakan Daftar atau Masuk/)).toBeDefined();
  });

  it('shows time slot pills when schedule data is loaded', () => {
    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('mock-drawer-trigger'));
    const dateElements = screen.getAllByText(/15 June 2026/);
    expect(dateElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no schedule data', () => {
    vi.mocked(useFindAvailability).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    } as any);

    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('mock-drawer-trigger'));
    expect(screen.getByText('No available time slots')).toBeDefined();
  });

  it('shows error state when fetch fails', () => {
    vi.mocked(useFindAvailability).mockReturnValue({
      data: null,
      isLoading: false,
      isError: true
    } as any);

    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('mock-drawer-trigger'));
    expect(screen.getByText('Unable to load available slots')).toBeDefined();
  });

  it('handles date selection via Calendar', () => {
    vi.mocked(useFindAvailability).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false
    } as any);

    render(
      <PractitionerAvailability
        practitionerRole={mockPractitionerRole}
        scheduleId='schedule-1'
      >
        <div>Book Now</div>
      </PractitionerAvailability>,
      { wrapper: createWrapper(queryClient) }
    );
    fireEvent.click(screen.getByTestId('mock-drawer-trigger'));
    fireEvent.click(screen.getByTestId('calendar-date-btn'));
    expect(mockBookingDispatch).toHaveBeenCalled();
  });
});
