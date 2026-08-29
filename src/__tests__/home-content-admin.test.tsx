import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { type AxiosInstance } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeContentAdmin from '../app/home-content-admin';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
}));

import { useAuth } from '@/context/auth/authContext';
import { dbGet } from '@/lib/indexeddb';
import { getAPI } from '@/services/api';

const mockAxiosInstance = { get: vi.fn() };

describe('HomeContentAdmin', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
    vi.clearAllMocks();
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
    vi.mocked(getAPI).mockResolvedValue(
      mockAxiosInstance as unknown as AxiosInstance
    );
    // Default: provide an org ID so queries fire
    vi.mocked(dbGet).mockImplementation((_store, args) => {
      if (args?.[1] === 'clinic_organization')
        return Promise.resolve({ value: 'org-1' });
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  describe('practitioner count query', () => {
    it('does not read selected_location from IndexedDB', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { total: 12 } });

      render(<HomeContentAdmin />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('12')).toBeDefined();
      });

      // Should only read clinic_organization
      const clinicCalls = vi
        .mocked(dbGet)
        .mock.calls.filter(([, args]) => args?.[1] === 'clinic_organization');
      const locationCalls = vi
        .mocked(dbGet)
        .mock.calls.filter(([, args]) => args?.[1] === 'selected_location');
      expect(clinicCalls.length).toBeGreaterThanOrEqual(1);
      expect(locationCalls).toHaveLength(0);
    });
    it('uses organization-based filter with active=true', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: { total: 12 } });

      render(<HomeContentAdmin />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText('12')).toBeDefined();
      });

      const calledUrl = mockAxiosInstance.get.mock.calls[0][0] as string;
      expect(calledUrl).toContain(
        '_has:PractitionerRole:practitioner:organization=Organization/org-1'
      );
      expect(calledUrl).toContain(
        '_has:PractitionerRole:practitioner:active=true'
      );
      expect(calledUrl).toContain('_summary=count');
    });

    it('does not fetch when no clinic is stored', async () => {
      vi.mocked(dbGet).mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue({ data: { total: 12 } });

      render(<HomeContentAdmin />, { wrapper });

      // Wait for effects to settle, then verify no fetch occurred
      await vi.waitFor(() => {
        // With no clinic ID, query is disabled — should render content not skeleton
        expect(mockAxiosInstance.get).not.toHaveBeenCalled();
      });
    });

    it('renders dashboard content when no clinic is stored (no skeleton)', async () => {
      vi.mocked(dbGet).mockResolvedValue(null);
      mockAxiosInstance.get.mockResolvedValue({ data: { total: 12 } });

      render(<HomeContentAdmin />, { wrapper });

      // Service Management should render immediately, not skeleton
      await waitFor(() => {
        expect(screen.getByText('Service Management')).toBeDefined();
      });
      expect(screen.getByText('Clinic Details')).toBeDefined();
      expect(screen.getByText('Reports')).toBeDefined();
      // Booked Appointments and Pending Approvals should render as placeholders
      expect(screen.getByText('Booked Appointments Today')).toBeDefined();
      expect(screen.getByText('Pending Approvals')).toBeDefined();
    });
  });

  it.each([
    {
      total: 12,
      verify: () =>
        expect(screen.getByText('Active Practitioners')).toBeDefined()
    },
    {
      total: 8,
      verify: () => {
        const link = screen.getByText('Active Practitioners').closest('a');
        expect(link).toHaveAttribute('href', '/practitioner');
      }
    },
    {
      total: 5,
      verify: () => expect(screen.queryByText('Clinic Overview')).toBeNull()
    }
  ])(
    'renders practitioner count stat for total $total',
    async ({ total, verify }) => {
      mockAxiosInstance.get.mockResolvedValue({ data: { total } });

      render(<HomeContentAdmin />, { wrapper });

      await waitFor(() => {
        expect(screen.getByText(String(total))).toBeDefined();
      });

      verify();
    }
  );

  it('shows retry button on error', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load practitioner data. Tap to retry.')
      ).toBeDefined();
    });
  });

  it('does NOT render Clinic Context section', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { total: 5 } });

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });
    expect(screen.queryByText('Clinic Context')).toBeNull();
    expect(screen.queryByText('Clinic switcher coming soon')).toBeNull();
  });

  it('renders Booked Appointments Today stat', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { total: 5 } });

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });
    expect(screen.getByText('Booked Appointments Today')).toBeDefined();
  });

  it('renders Pending Approvals stat', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { total: 5 } });

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });
    expect(screen.getByText('Pending Approvals')).toBeDefined();
  });

  it('renders only Clinic Details and Reports in Service Management', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { total: 5 } });

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Service Management')).toBeDefined();
      expect(screen.getByText('Clinic Details')).toBeDefined();
      expect(screen.getByText('Reports')).toBeDefined();
    });

    expect(screen.queryByText('Manage Practitioners')).toBeNull();
    expect(screen.queryByText('Clinic Settings')).toBeNull();
    expect(screen.queryByText('View Schedule')).toBeNull();
  });
});
