/* eslint-disable max-lines */
import { useAuth } from '@/context/auth/authContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type Location } from 'fhir/r4';
import { useRouter } from 'next/navigation';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClinicList from '../clinic-list';

// ---------------------------------------------------------------------------
// Mocks — heavy dependencies to keep component test focused
// ---------------------------------------------------------------------------

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='mock-page-header' />
}));

vi.mock('./clinic-filter', () => ({
  default: () => <div data-testid='mock-clinic-filter' />
}));

vi.mock('@/hooks/useSearchWithFallback', () => ({
  useSearchWithFallback: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbSet: vi.fn(() => Promise.resolve())
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(() => '/clinic'),
  useSearchParams: vi.fn(() => new URLSearchParams())
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: Record<string, unknown>) => {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src as string}
        alt={alt as string}
        data-testid='next-image'
        {...props}
      />
    );
  }
}));

vi.mock('@/services/clinic-locations', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useClinicLocations: vi.fn()
  };
});

import { useSearchWithFallback } from '@/hooks/useSearchWithFallback';
import { useClinicLocations } from '@/services/clinic-locations';

const mockPush = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

function createMockLocation(
  id: string,
  name: string,
  city?: string,
  hours?: Location['hoursOfOperation']
): Location {
  return {
    resourceType: 'Location',
    id,
    name,
    address: city
      ? { city, line: ['Jl. Test'], district: 'Test', country: 'ID' }
      : undefined,
    hoursOfOperation: hours ?? [
      {
        daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
        openingTime: '09:00:00',
        closingTime: '18:00:00'
      }
    ]
  } as Location;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({
    push: mockPush
  } as unknown as ReturnType<typeof useRouter>);
  globalThis.window.scrollTo = vi.fn();

  // Default: locations exist but empty
  vi.mocked(useClinicLocations).mockReturnValue({
    data: [] as Location[],
    isLoading: false,
    isSuccess: true
  } as never);

  // Default: no search term, show all data
  vi.mocked(useSearchWithFallback).mockReturnValue({
    filteredData: [],
    isServerSearching: false,
    showServerResults: false,
    serverSearchCompleted: false,
    serverData: undefined
  } as never);
});

afterEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Role-based rendering
// ---------------------------------------------------------------------------

describe('ClinicList — renders', () => {
  it('renders locations for Patient role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Main Clinic')).toBeDefined();
    });
  });

  it('renders locations for Clinic Admin role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: undefined,
          organizationId: 'org-1'
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-2', 'Admin Clinic', 'Bandung')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Admin Clinic')).toBeDefined();
    });
  });

  it('renders locations for Practitioner role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Practitioner',
          fhirId: 'prac-1',
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-3', 'My Practice', 'Surabaya')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('My Practice')).toBeDefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Card content and click behavior
// ---------------------------------------------------------------------------

describe('ClinicList — cards', () => {
  it('shows work hours on the card', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    vi.useFakeTimers({ now: new Date(2026, 0, 5), toFake: ['Date'] });

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Open until 18:00')).toBeDefined();
    });

    vi.useRealTimers();
  });

  it('shows "Closed today" when location is closed', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    vi.useFakeTimers({ now: new Date(2026, 0, 10), toFake: ['Date'] });

    const locations = [
      createMockLocation('loc-1', 'Weekend Clinic', 'Jakarta', [
        {
          daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
          openingTime: '09:00:00',
          closingTime: '17:00:00'
        }
      ])
    ];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText('Closed today')).toBeDefined();
    });

    vi.useRealTimers();
  });

  it('shows city on card', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText(/Jakarta/)).toBeDefined();
    });
  });

  it('navigates to detail for Patient role on click', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('location-card-loc-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('location-card-loc-1'));

    expect(mockPush).toHaveBeenCalledWith('/clinic?id=loc-1');
  });

  it('does not query locations when auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: false,
        userInfo: {
          role_name: 'Guest',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    // When auth is loading, the hook should receive empty role to disable query
    const lastCall = vi.mocked(useClinicLocations).mock.calls.at(-1)?.[0];
    expect(lastCall?.role).toBe('');
    expect(lastCall?.fhirId).toBeUndefined();
    expect(lastCall?.orgId).toBeUndefined();
  });

  it('uses 4:3 aspect ratio on card', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const card = screen.getByTestId('location-card-loc-1');
      expect(card.className).toContain('aspect-[');
    });
  });

  it('uses default image instead of gradient', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const img = screen.getByRole('img');
      expect(img.getAttribute('src')).toBe('/images/clinic.jpg');
    });
  });

  it('shows MapPin icon alongside city', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    vi.useFakeTimers({ now: new Date(2026, 0, 5), toFake: ['Date'] });

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    const { container } = render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const mapPin = container.querySelector('.lucide-map-pin');
      expect(mapPin).not.toBeNull();
    });

    vi.useRealTimers();
  });

  it('shows Clock icon alongside hours', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    vi.useFakeTimers({ now: new Date(2026, 0, 5), toFake: ['Date'] });

    const locations = [createMockLocation('loc-1', 'Main Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    const { container } = render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      const clock = container.querySelector('.lucide-clock');
      expect(clock).not.toBeNull();
    });

    vi.useRealTimers();
  });

  it('navigates to detail for Clinic Admin role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: undefined,
          organizationId: 'org-1'
        }
      },
      isLoading: false
    } as never);

    const locations = [createMockLocation('loc-1', 'Admin Clinic', 'Jakarta')];
    vi.mocked(useClinicLocations).mockReturnValue({
      data: locations,
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicList />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('location-card-loc-1')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('location-card-loc-1'));

    expect(mockPush).toHaveBeenCalledWith('/clinic?id=loc-1');
  });
});
