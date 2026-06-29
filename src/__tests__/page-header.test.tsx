import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../components/page-header';

// Hoisted mocks — must be at module root
vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  useRouter: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), back: vi.fn(), replace: vi.fn() })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: vi.fn().mockReturnValue({
    appointmentData: null,
    sessionData: null,
    isAuthLoading: false
  })
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/components/general/avatar', () => ({
  default: () => <div data-testid='mock-avatar'>Avatar</div>
}));

import { useAuth } from '@/context/auth/authContext';
import { dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const mockAxiosInstance = { get: vi.fn() };

describe('PageHeader - admin clinic card', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    // Re-establish default mock implementations after clearAllMocks
    vi.mocked(dbGet).mockResolvedValue(null);
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    vi.mocked(usePathname).mockReturnValue('/');
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders clinic name card for admin when clinic data loads', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: 'admin-1',
          fullname: 'Admin User',
          email: 'admin@clinic.com'
        }
      },
      dispatch: vi.fn()
    });
    // Return a clinic ID from IndexedDB so the query fires
    vi.mocked(dbGet).mockResolvedValueOnce({ value: 'org-123' });
    // Mock Location query returning a name
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: {
        entry: [{ resource: { name: 'Klinik Sehat Cyberjaya' } }]
      }
    });

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Currently Managing')).toBeDefined();
    });
    expect(screen.getByText('Klinik Sehat Cyberjaya')).toBeDefined();
  });

  it('falls back to Organization.name with correct query separator', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: 'admin-1',
          fullname: 'Admin User',
          email: 'admin@clinic.com'
        }
      },
      dispatch: vi.fn()
    });
    // Return a clinic ID so the query fires
    vi.mocked(dbGet).mockResolvedValueOnce({ value: 'org-456' });
    // Location query returns empty bundle; Organization query returns name
    mockAxiosInstance.get
      .mockResolvedValueOnce({ data: { entry: [] } })
      .mockResolvedValueOnce({ data: { name: 'Konsulin HQ' } });

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Currently Managing')).toBeDefined();
    });
    expect(screen.getByText('Konsulin HQ')).toBeDefined();

    // Verify Organization URL uses ? not &
    const secondCallUrl = mockAxiosInstance.get.mock.calls[1]?.[0] as string;
    expect(secondCallUrl).toBe('/fhir/Organization/org-456?_elements=name');
  });

  it('does NOT render clinic card for patient role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: 'patient-1',
          fullname: 'John Doe',
          email: 'john@example.com'
        }
      },
      dispatch: vi.fn()
    });

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.queryByText('Currently Managing')).toBeNull();
    });
  });

  it('does NOT render clinic card for practitioner role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Practitioner',
          fhirId: 'practitioner-1',
          fullname: 'Dr. Smith',
          email: 'smith@clinic.com'
        }
      },
      dispatch: vi.fn()
    });

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.queryByText('Currently Managing')).toBeNull();
    });
  });

  it('does NOT render clinic card when admin has no selected clinic', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: 'admin-1',
          fullname: 'Admin User',
          email: 'admin@clinic.com'
        }
      },
      dispatch: vi.fn()
    });
    // dbGet returns null — clinic_organization not stored
    // No API mocks needed — query stays disabled

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.queryByText('Currently Managing')).toBeNull();
    });
  });
});

describe('PageHeader - back navigation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/clinic');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
    vi.mocked(dbGet).mockResolvedValue(null);
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('calls router.replace instead of router.push when back chevron is clicked', () => {
    const router = {
      push: vi.fn(),
      back: vi.fn(),
      replace: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn()
    };
    vi.mocked(useRouter).mockReturnValue(router);

    render(<PageHeader />, { wrapper });

    const chevron = document.querySelector('.lucide-chevron-left');
    expect(chevron).not.toBeNull();

    if (chevron) {
      fireEvent.click(chevron);
    }

    // Should use replace, not push, to avoid polluting history stack
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('calls router.back when no backAction is available', () => {
    const router = {
      push: vi.fn(),
      back: vi.fn(),
      replace: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      prefetch: vi.fn()
    };
    vi.mocked(useRouter).mockReturnValue(router);
    // Use a path not in FIRST_LEVEL_ROUTES to get backAction=undefined
    vi.mocked(usePathname).mockReturnValue('/some-unknown-page');

    render(<PageHeader />, { wrapper });

    const chevron = document.querySelector('.lucide-chevron-left');
    expect(chevron).not.toBeNull();

    if (chevron) {
      fireEvent.click(chevron);
    }

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not render back chevron on the home page', () => {
    vi.mocked(usePathname).mockReturnValue('/');

    render(<PageHeader />, { wrapper });

    const chevron = document.querySelector('.lucide-chevron-left');
    expect(chevron).toBeNull();
  });
});
