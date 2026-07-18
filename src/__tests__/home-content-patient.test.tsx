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

vi.mock('@/hooks/usePatientRecords', () => ({
  usePatientRecords: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() })
}));

import { useAuth } from '@/context/auth/authContext';
import type { UseRecordsResult } from '@/hooks/usePatientRecords';
import { usePatientRecords } from '@/hooks/usePatientRecords';

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
    vi.mocked(usePatientRecords).mockReturnValue({
      records: [],
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    } as UseRecordsResult);
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

  it('shows at most 5 previous records', () => {
    const records = Array.from({ length: 8 }, (_, i) => ({
      type: 'Observation' as const,
      resourceType: 'Observation',
      id: `obs-${i}`,
      title: `Record ${i}`,
      result: `result ${i}`,
      lastUpdated: '2024-06-01T00:00:00Z'
    }));

    vi.mocked(usePatientRecords).mockReturnValue({
      records,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false
    } as UseRecordsResult);

    render(<HomeContentPatient />, { wrapper });

    // Each RecordCard renders a <Link>. Plus one "See All" link.
    // 5 cards + 1 "See All" = 6 links with href starting with /record
    const recordLinks = screen
      .getAllByRole('link')
      .filter(l => l.getAttribute('href')?.startsWith('/record'));
    expect(recordLinks).toHaveLength(5);
  });
});
