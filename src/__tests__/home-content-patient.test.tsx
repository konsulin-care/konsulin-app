import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeContentPatient from '../app/home-content-patient';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/api', () => ({
  getAPI: vi.fn()
}));

vi.mock('@/services/api/record', () => ({
  useRecordSummaryQuery: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

import { useAuth } from '@/context/auth/authContext';
import { useRecordSummaryQuery } from '@/services/api/record';
import { type IBundleResponse } from '@/types/record';
import { type UseQueryResult } from '@tanstack/react-query';

describe('HomeContentPatient', () => {
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
          role_name: 'Patient',
          fhirId: 'patient-1',
          fullname: 'John Doe',
          email: 'john@example.com'
        }
      },
      dispatch: vi.fn()
    });
    vi.mocked(useRecordSummaryQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      refetch: vi.fn()
    } as unknown as UseQueryResult<IBundleResponse[], Error>);
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders quick action links', () => {
    render(<HomeContentPatient />, { wrapper });
    expect(screen.getByText('Show All Clinics')).toBeDefined();
    expect(screen.getByText('Find practitioners near you')).toBeDefined();
  });

  it('renders previous records section', () => {
    render(<HomeContentPatient />, { wrapper });
    expect(screen.getByText('Previous Records')).toBeDefined();
    expect(screen.getByText('See All')).toBeDefined();
  });
});
