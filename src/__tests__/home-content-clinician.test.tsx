import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeContentClinician from '../app/home-content-clinician';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/api/appointments', () => ({
  useGetTodaySessions: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

import { useAuth } from '@/context/auth/authContext';
import { useGetTodaySessions } from '@/services/api/appointments';
import { type UseQueryResult } from '@tanstack/react-query';

describe('HomeContentClinician', () => {
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
          role_name: 'Practitioner',
          fhirId: 'practitioner-1',
          fullname: 'Dr. Jane Smith',
          email: 'jane@clinic.com'
        }
      },
      dispatch: vi.fn()
    });
    vi.mocked(useGetTodaySessions).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as unknown as UseQueryResult);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders today schedule section', () => {
    render(<HomeContentClinician />, { wrapper });
    expect(screen.getByText("Today's Schedule")).toBeDefined();
  });

  it('shows empty state when no sessions', () => {
    render(<HomeContentClinician />, { wrapper });
    expect(screen.getByText('No sessions scheduled for today')).toBeDefined();
  });

  it('renders quick action links', () => {
    render(<HomeContentClinician />, { wrapper });
    expect(screen.getByText('SOAP Report')).toBeDefined();
    expect(screen.getByText('Health Exercise Resources')).toBeDefined();
  });
});
