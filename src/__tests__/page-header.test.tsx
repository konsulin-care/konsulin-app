import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const mockAxiosInstance: { get: ReturnType<typeof vi.fn> } = { get: vi.fn() };

describe('PageHeader - admin clinic card', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    // Re-establish default mock implementations after clearAllMocks
    vi.mocked(dbGet).mockResolvedValue(null);
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
    vi.mocked(usePathname).mockReturnValue('/');
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  function mockAuthState(overrides: Record<string, unknown> = {}) {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: 'admin-1',
          fullname: 'Admin User',
          email: 'admin@clinic.com',
          ...overrides
        }
      },
      dispatch: vi.fn()
    });
  }

  it('renders clinic name card for admin from Organization resource', async () => {
    mockAuthState();
    // Return a clinic ID from IndexedDB so the query fires
    vi.mocked(dbGet).mockResolvedValueOnce({ value: 'org-123' });
    // Mock Organization query returning the org name
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { name: 'Konsulin HQ' }
    });

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Currently Managing')).toBeDefined();
    });
    expect(screen.getByText('Konsulin HQ')).toBeDefined();
  });

  it('queries Organization directly with correct URL', async () => {
    mockAuthState();
    // Return a clinic ID so the query fires
    vi.mocked(dbGet).mockResolvedValueOnce({ value: 'org-456' });
    // Single Organization query returns the org name
    mockAxiosInstance.get.mockResolvedValueOnce({
      data: { name: 'Konsulin HQ' }
    });

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Currently Managing')).toBeDefined();
    });
    expect(screen.getByText('Konsulin HQ')).toBeDefined();

    // Should make exactly one API call — to Organization, not Location
    expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
    const calledUrl = mockAxiosInstance.get.mock.calls[0][0] as string;
    expect(calledUrl).toBe('/fhir/Organization/org-456?_elements=name');
  });

  it('does NOT render clinic card for patient role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: 'Patient', fhirId: 'patient-1' }
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
        userInfo: { role_name: 'Practitioner', fhirId: 'practitioner-1' }
      },
      dispatch: vi.fn()
    });

    render(<PageHeader />, { wrapper });

    await waitFor(() => {
      expect(screen.queryByText('Currently Managing')).toBeNull();
    });
  });

  it('does NOT render clinic card when admin has no selected clinic', async () => {
    mockAuthState();
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
    vi.mocked(getAPI).mockResolvedValue(mockAxiosInstance);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  function setupMockRouter() {
    const router = { push: vi.fn(), back: vi.fn() };
    vi.mocked(useRouter).mockReturnValue(router);
    return router;
  }

  function clickChevron() {
    const chevron = document.querySelector('.lucide-chevron-left');
    if (chevron) fireEvent.click(chevron);
    return chevron !== null;
  }

  it('calls router.push for cross-route back navigation (/clinic → /)', () => {
    const router = setupMockRouter();

    render(<PageHeader />, { wrapper });

    expect(clickChevron()).not.toBeNull();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/');
  });

  it('calls router.push for same-route back navigation (/clinic?id=xxx → /clinic)', () => {
    const router = setupMockRouter();
    // Simulate clinic detail view with backRoute override
    render(
      <PageHeader pageIndicator='Check Out Clinic' backRoute='/clinic' />,
      { wrapper }
    );

    expect(clickChevron()).not.toBeNull();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/clinic');
  });

  it('calls router.back when no backAction is available', () => {
    const router = setupMockRouter();
    // Use a path not in MAIN_ROUTES to get backAction=undefined
    vi.mocked(usePathname).mockReturnValue('/some-unknown-page');

    render(<PageHeader />, { wrapper });

    expect(clickChevron()).not.toBeNull();

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('handles trailing slash in pathname — /clinic/ triggers router.push("/") not router.back()', () => {
    // Simulate trailingSlash:true config — usePathname returns /clinic/
    vi.mocked(usePathname).mockReturnValue('/clinic/');
    const router = setupMockRouter();

    render(<PageHeader />, { wrapper });

    expect(clickChevron()).not.toBeNull();

    expect(router.push).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('calls router.push("/") for /record (no params)', () => {
    vi.mocked(usePathname).mockReturnValue('/record');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
    const router = setupMockRouter();

    render(<PageHeader />, { wrapper });

    expect(clickChevron()).not.toBeNull();

    expect(router.push).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
  });

  it('calls router.back() for /record?edit=xxx', () => {
    vi.mocked(usePathname).mockReturnValue('/record');
    const params = new URLSearchParams('edit=Observation/test-id-123');
    vi.mocked(useSearchParams).mockReturnValue(
      params as unknown as ReturnType<typeof useSearchParams>
    );
    const router = setupMockRouter();

    render(<PageHeader />, { wrapper });

    expect(clickChevron()).not.toBeNull();

    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('does not render back chevron on the home page', () => {
    vi.mocked(usePathname).mockReturnValue('/');

    render(<PageHeader />, { wrapper });

    const chevron = document.querySelector('.lucide-chevron-left');
    expect(chevron).toBeNull();
  });
});
