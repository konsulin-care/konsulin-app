import { Roles } from '@/constants/roles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomeContent from '../app/home-content';

// Mock all child components
vi.mock('@/app/home-content-guest', () => ({
  default: () => <div data-testid='guest-content'>Guest</div>
}));
vi.mock('@/app/home-content-patient', () => ({
  default: () => <div data-testid='patient-content'>Patient</div>
}));
vi.mock('@/app/practitioner-dashboard', () => ({
  default: () => <div data-testid='clinician-content'>Clinician</div>
}));
vi.mock('@/app/home-content-admin', () => ({
  default: () => <div data-testid='admin-content'>Admin</div>
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/components/general/content-wraper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='content-wrapper'>{children}</div>
  )
}));

import { useAuth } from '@/context/auth/authContext';

describe('HomeContent dispatcher', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('renders guest content for guest role', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: false,
        userInfo: { role_name: Roles.Guest }
      },
      dispatch: vi.fn()
    });

    render(<HomeContent />, { wrapper });
    expect(screen.getByTestId('guest-content')).toBeDefined();
  });

  it('renders patient content for patient role', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: Roles.Patient }
      },
      dispatch: vi.fn()
    });

    render(<HomeContent />, { wrapper });
    expect(screen.getByTestId('patient-content')).toBeDefined();
  });

  it('renders clinician content for practitioner role', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: Roles.Practitioner }
      },
      dispatch: vi.fn()
    });

    render(<HomeContent />, { wrapper });
    expect(screen.getByTestId('clinician-content')).toBeDefined();
  });

  it('renders admin content for clinic admin role', () => {
    vi.mocked(useAuth).mockReturnValue({
      isLoading: false,
      state: {
        isAuthenticated: true,
        userInfo: { role_name: Roles.ClinicAdmin }
      },
      dispatch: vi.fn()
    });

    render(<HomeContent />, { wrapper });
    expect(screen.getByTestId('admin-content')).toBeDefined();
  });
});
