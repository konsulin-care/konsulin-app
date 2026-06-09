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

  it('renders all management links', async () => {
    mockAxiosInstance.get.mockResolvedValue({ data: { total: 5 } });

    render(<HomeContentAdmin />, { wrapper });

    await waitFor(() => {
      expect(screen.getByText('Manage Practitioners')).toBeDefined();
    });
    expect(screen.getByText('Clinic Settings')).toBeDefined();
    expect(screen.getByText('View Schedule')).toBeDefined();
    expect(screen.getByText('Reports')).toBeDefined();
  });
});
