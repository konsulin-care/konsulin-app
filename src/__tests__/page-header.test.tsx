import { createQueryClient } from '@/__tests__/test-utils';
import { QueryClientProvider } from '@tanstack/react-query';
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
import type { AxiosInstance } from 'axios';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const mockAxiosInstance: { get: ReturnType<typeof vi.fn> } = { get: vi.fn() };

describe('PageHeader - admin clinic card', () => {
  let queryClient: ReturnType<typeof createQueryClient>;

  beforeEach(() => {
    queryClient = createQueryClient();
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
  let queryClient: ReturnType<typeof createQueryClient>;

  beforeEach(() => {
    queryClient = createQueryClient();
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

  function setupMockRouter() {
    const router = {
      push: vi.fn(),
      back: vi.fn(),
      forward: vi.fn(),
      refresh: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      bfcacheId: '0'
    };
    vi.mocked(useRouter).mockReturnValue(router);
    return router;
  }

  function clickChevron() {
    const chevron = document.querySelector('.lucide-chevron-left');
    if (chevron) fireEvent.click(chevron);
    return chevron !== null;
  }

  it('renders anchor with correct href for cross-route back (/clinic → /)', () => {
    setupMockRouter();

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders anchor for same-route back (/clinic?id=xxx → /clinic)', () => {
    setupMockRouter();
    render(
      <PageHeader pageIndicator='Check Out Clinic' backRoute='/clinic' />,
      { wrapper }
    );

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', '/clinic');
  });

  it('calls router.back when no backAction is available', () => {
    const router = setupMockRouter();
    vi.mocked(usePathname).mockReturnValue('/some-unknown-page');

    render(<PageHeader />, { wrapper });

    // No anchor for unknown routes
    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toBeNull();

    // Button calls router.back
    const button = document.querySelector('button[aria-label="Go back"]');
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(router.back).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('handles trailing slash — /clinic/ renders anchor to /', () => {
    vi.mocked(usePathname).mockReturnValue('/clinic/');
    setupMockRouter();

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders anchor href / for /record (no params)', () => {
    vi.mocked(usePathname).mockReturnValue('/record');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
    setupMockRouter();

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders anchor href /record for /record?edit=xxx', () => {
    vi.mocked(usePathname).mockReturnValue('/record');
    const params = new URLSearchParams('edit=Observation/test-id-123');
    vi.mocked(useSearchParams).mockReturnValue(
      params as unknown as ReturnType<typeof useSearchParams>
    );
    setupMockRouter();

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute('href', '/record');
  });

  it('renders anchor href /assessments for /assessments?id=phq2', () => {
    vi.mocked(usePathname).mockReturnValue('/assessments');
    const params = new URLSearchParams('id=phq2');
    vi.mocked(useSearchParams).mockReturnValue(
      params as unknown as ReturnType<typeof useSearchParams>
    );
    setupMockRouter();

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toHaveAttribute('href', '/assessments');
  });

  it('does not render back chevron on the home page', () => {
    vi.mocked(usePathname).mockReturnValue('/');

    render(<PageHeader />, { wrapper });

    const chevron = document.querySelector('.lucide-chevron-left');
    expect(chevron).toBeNull();
  });
});
