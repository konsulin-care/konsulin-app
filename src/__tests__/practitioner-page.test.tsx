/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, unicorn/numeric-separators-style, @next/next/no-img-element, jsx-a11y/alt-text */

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBooking } from '@/context/booking/bookingContext';
import { dbGet } from '@/lib/indexeddb';
import { useDetailPractitioner } from '@/services/clinic';
import { useRouter, useSearchParams } from 'next/navigation';

// ---------------------------------------------------------------------------
// Mocks – vi.mock is hoisted so these run before any import
// ---------------------------------------------------------------------------

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn()
}));

vi.mock('@/context/booking/bookingContext', () => ({
  useBooking: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn()
}));

vi.mock('@/services/clinic', () => ({
  useDetailPractitioner: vi.fn()
}));

vi.mock('@/components/general/avatar', () => ({
  default: ({ initials }: any) => (
    <div data-testid='mock-avatar'>{initials}</div>
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

vi.mock('@/components/page-header', () => ({
  default: ({ pageIndicator }: any) => (
    <div data-testid='mock-page-header'>{pageIndicator}</div>
  )
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span data-testid='mock-badge'>{children}</span>
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button data-testid='mock-button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
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
  DrawerFooter: ({ children }: any) => (
    <div data-testid='mock-drawer-footer'>{children}</div>
  ),
  DrawerHeader: ({ children }: any) => (
    <div data-testid='mock-drawer-header'>{children}</div>
  ),
  DrawerTitle: ({ children }: any) => (
    <div data-testid='mock-drawer-title'>{children}</div>
  )
}));

vi.mock('next/image', () => ({
  default: (props: any) => <img data-testid='mock-image' {...props} />
}));

vi.mock('lucide-react', () => ({
  ArrowRightIcon: () => <svg data-testid='mock-arrow-right' />,
  CalendarDaysIcon: () => <svg data-testid='mock-calendar-days' />,
  HeartPulse: () => <svg data-testid='mock-heart-pulse' />,
  HospitalIcon: () => <svg data-testid='mock-hospital' />
}));

// Mock PractitionerAvailability using its app-relative path.
vi.mock('@/app/practitioner/practitioner-availability', () => ({
  default: ({ practitionerOrganizationName, children }: any) => (
    <div data-testid='mock-practitioner-availability'>
      <span data-testid='org-name-prop'>{practitionerOrganizationName}</span>
      {children}
    </div>
  )
}));

// Static import – mocks are hoisted, so the component gets mocked deps.
import Practitioner from '@/app/practitioner/page';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let mockRouter: any;
let mockSearchParams: any;
let mockBookingDispatch: any;
let mockBookingState: any;

beforeEach(() => {
  mockRouter = { push: vi.fn() };
  mockSearchParams = new URLSearchParams('practitionerRoleId=test-role-id');
  mockBookingDispatch = vi.fn();
  mockBookingState = { isBookingSubmitted: false };

  vi.mocked(useRouter).mockReturnValue(mockRouter);
  vi.mocked(useSearchParams).mockReturnValue(mockSearchParams);
  vi.mocked(useBooking).mockReturnValue({
    state: mockBookingState,
    dispatch: mockBookingDispatch
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Practitioner page – null safety', () => {
  it('renders loading state when practitionerDataLoading is true (no crash)', () => {
    // dbGet never resolves → practitionerDataLoading stays true.
    vi.mocked(dbGet).mockReturnValue(
      new Promise(() => {
        /* never resolves */
      })
    );
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: true,
      isError: false,
      isFetching: true
    });

    // Should not throw despite detailPractitioner being undefined.
    expect(() => render(<Practitioner />)).not.toThrow();

    // Loading state should be visible.
    expect(screen.getByTestId('mock-loading-spinner')).toBeInTheDocument();
  });

  it('renders empty state when practitionerData loaded but detailPractitioner is undefined', async () => {
    vi.mocked(dbGet).mockResolvedValue({
      value: {
        roleId: 'test-role-id',
        name: [{ given: ['John'], family: 'Doe' }],
        photo: [],
        qualification: [],
        email: 'john@test.com'
      }
    });
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: true,
      isFetching: false
    });

    render(<Practitioner />);
    await vi.waitFor(() => {
      expect(screen.getByTestId('mock-empty-state')).toBeInTheDocument();
    });
  });

  it('renders empty state when practitionerData is null in IndexedDB', async () => {
    vi.mocked(dbGet).mockResolvedValue(null);
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false,
      isFetching: false
    });

    render(<Practitioner />);
    await vi.waitFor(() => {
      expect(screen.getByTestId('mock-empty-state')).toBeInTheDocument();
    });
  });

  it('renders availability when both practitionerData and detailPractitioner are present', async () => {
    const mockDetailData: any = {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        specialty: [{ text: 'Cardiology' }]
      },
      organization: { name: 'Test Clinic' },
      invoice: { totalNet: { value: 150000, currency: 'IDR' } },
      schedule: { id: 'sched-1' }
    };

    vi.mocked(dbGet).mockResolvedValue({
      value: {
        roleId: 'test-role-id',
        name: [{ given: ['John'], family: 'Doe' }],
        photo: [],
        qualification: [],
        email: 'john@test.com'
      }
    });
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: mockDetailData,
      isLoading: false,
      isError: false,
      isFetching: false
    });

    render(<Practitioner />);
    await vi.waitFor(() => {
      expect(
        screen.getByTestId('mock-practitioner-availability')
      ).toBeInTheDocument();
    });
    expect(screen.getByTestId('org-name-prop')).toHaveTextContent(
      'Test Clinic'
    );
  });

  it('renders without crashing when detailPractitioner.resource is undefined (missing PractitionerRole in bundle)', async () => {
    const mockMissingResource: any = {
      organization: { name: 'Test Clinic' },
      invoice: { totalNet: { value: 150000, currency: 'IDR' } },
      schedule: { id: 'sched-1' }
    };

    vi.mocked(dbGet).mockResolvedValue({
      value: {
        roleId: 'test-role-id',
        name: [{ given: ['John'], family: 'Doe' }],
        photo: [],
        qualification: [],
        email: 'john@test.com'
      }
    });
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: mockMissingResource,
      isLoading: false,
      isError: false,
      isFetching: false
    });

    expect(() => render(<Practitioner />)).not.toThrow();
    await vi.waitFor(() => {
      expect(
        screen.getByTestId('mock-practitioner-availability')
      ).toBeInTheDocument();
    });
  });

  it('renders empty state when detailPractitioner is undefined with isError=false (guard edge case)', async () => {
    vi.mocked(dbGet).mockResolvedValue({
      value: {
        roleId: 'test-role-id',
        name: [{ given: ['John'], family: 'Doe' }],
        photo: [],
        qualification: [],
        email: 'john@test.com'
      }
    });
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: undefined,
      isLoading: false,
      isError: false,
      isFetching: false
    });

    expect(() => render(<Practitioner />)).not.toThrow();
    await vi.waitFor(() => {
      expect(screen.getByTestId('mock-empty-state')).toBeInTheDocument();
    });
  });

  it('renders without crashing when organization is missing from detailPractitioner', async () => {
    const mockDataWithoutOrg: any = {
      resource: {
        resourceType: 'PractitionerRole',
        id: 'role-1',
        specialty: [{ text: 'Cardiology' }]
      },
      invoice: { totalNet: { value: 150000, currency: 'IDR' } },
      schedule: { id: 'sched-1' }
    };

    vi.mocked(dbGet).mockResolvedValue({
      value: {
        roleId: 'test-role-id',
        name: [{ given: ['John'], family: 'Doe' }],
        photo: [],
        qualification: [],
        email: 'john@test.com'
      }
    });
    vi.mocked(useDetailPractitioner).mockReturnValue({
      newData: mockDataWithoutOrg,
      isLoading: false,
      isError: false,
      isFetching: false
    });

    expect(() => render(<Practitioner />)).not.toThrow();
    await vi.waitFor(() => {
      expect(
        screen.getByTestId('mock-practitioner-availability')
      ).toBeInTheDocument();
    });
  });
});
