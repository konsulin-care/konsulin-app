import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PractitionerDashboard from '../app/practitioner-dashboard';

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/hooks/usePractitionerDashboard', () => ({
  usePractitionerDashboard: vi.fn()
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid='mock-skeleton' className={className} />
  )
}));

import { useAuth } from '@/context/auth/authContext';
import { usePractitionerDashboard } from '@/services/hooks/usePractitionerDashboard';

describe('PractitionerDashboard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Practitioner',
          fhirId: 'practitioner-1',
          fullname: 'Dr. Jane'
        }
      },
      dispatch: vi.fn()
    });
    vi.mocked(usePractitionerDashboard).mockReturnValue({
      sessions: [],
      dayDots: new Map(),
      colorLegend: [],
      availableTime: [],
      listAvailableDate: [new Date('2026-07-15')],
      isLoading: false
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('shows loading skeleton when data is loading', () => {
    vi.mocked(usePractitionerDashboard).mockReturnValue({
      sessions: [],
      dayDots: new Map(),
      colorLegend: [],
      availableTime: [],
      listAvailableDate: [],
      isLoading: true
    });
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getAllByTestId('mock-skeleton').length).toBeGreaterThan(0);
  });

  it('renders calendar section', () => {
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getByText('My Schedule')).toBeDefined();
  });

  it('shows select prompt when no selected day', () => {
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getByText('Select a day to view appointments')).toBeDefined();
  });

  it('renders color legend when available', () => {
    vi.mocked(usePractitionerDashboard).mockReturnValue({
      sessions: [],
      dayDots: new Map(),
      colorLegend: [{ color: '#13C2C2', name: 'Clinic A' }],
      availableTime: [],
      listAvailableDate: [new Date('2026-07-15')],
      isLoading: false
    });
    render(<PractitionerDashboard />, { wrapper });
    expect(screen.getByText('Clinic A')).toBeDefined();
  });
});
