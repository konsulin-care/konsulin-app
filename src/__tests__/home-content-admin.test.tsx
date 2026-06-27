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
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders practitioner count when data loads', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { total: 12 } });

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('12')).toBeDefined();
    });
    expect(screen.getByText('Active Practitioners')).toBeDefined();
  });

  it('shows retry button on error', async () => {
    mockAxiosInstance.get.mockRejectedValue(new Error('API error'));

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(
        screen.getByText('Failed to load practitioner data. Tap to retry.')
      ).toBeDefined();
    });
  });

  it('does NOT render Clinic Overview title', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { total: 5 } });

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('5')).toBeDefined();
    });
    expect(screen.queryByText('Clinic Overview')).toBeNull();
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
    });
    expect(screen.getByText('Clinic Details')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();

    // Old management cards must be absent
    expect(screen.queryByText('Manage Practitioners')).toBeNull();
    expect(screen.queryByText('Clinic Settings')).toBeNull();
    expect(screen.queryByText('View Schedule')).toBeNull();
  });
});
