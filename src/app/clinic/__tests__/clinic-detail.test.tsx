import { useAuth } from '@/context/auth/authContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ClinicDetail from '../clinic-detail';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/components/page-header', () => ({
  default: () => <div data-testid='mock-page-header' />
}));

vi.mock('@/components/ui/drawer', () => ({
  Drawer: ({ children, open }: { children: ReactNode; open?: boolean }) =>
    open ? <div data-testid='mock-drawer'>{children}</div> : null,
  DrawerContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerDescription: () => null,
  DrawerFooter: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerHeader: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DrawerTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DrawerTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  )
}));

vi.mock('@/lib/indexeddb', () => ({
  STORES: { uiPreferences: 'ui_preferences' },
  dbSet: vi.fn(() => Promise.resolve()),
  dbGet: vi.fn()
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
  usePathname: vi.fn(() => '/clinic')
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn()
}));

vi.mock('@/services/clinic-locations', async importOriginal => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    useClinicLocationPractitioners: vi.fn(() => ({
      data: [],
      isLoading: false,
      isFetching: false,
      isSuccess: true
    })),
    getTodayHours: actual.getTodayHours
  };
});

import { useClinicLocationPractitioners } from '@/services/clinic-locations';

const mockPush = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({
    push: mockPush
  } as unknown as ReturnType<typeof useRouter>);
  globalThis.window.scrollTo = vi.fn();
  vi.mocked(useSearchParams).mockReturnValue(
    new URLSearchParams('id=loc-1') as unknown as ReturnType<
      typeof useSearchParams
    >
  );
});

afterEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// Non-admin role: shows practitioners
// ---------------------------------------------------------------------------

describe('ClinicDetail — Patient/Guest/Practitioner', () => {
  it('does not show drawer for Patient role', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    vi.mocked(useClinicLocationPractitioners).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByTestId('mock-drawer')).toBeNull();
      expect(screen.getByTestId('mock-page-header')).toBeDefined();
    });
  });

  it('fetches practitioners at the location', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Patient',
          fhirId: undefined,
          organizationId: undefined
        }
      },
      isLoading: false
    } as never);

    vi.mocked(useClinicLocationPractitioners).mockReturnValue({
      data: [{ resource: { resourceType: 'PractitionerRole', id: 'pr-1' } }],
      isLoading: false,
      isSuccess: true
    } as never);

    render(<ClinicDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(useClinicLocationPractitioners).toHaveBeenCalledWith('loc-1');
    });
  });
});

// ---------------------------------------------------------------------------
// Admin role: shows edit drawer
// ---------------------------------------------------------------------------

describe('ClinicDetail — Clinic Admin', () => {
  it('shows edit location drawer for Clinic Admin', async () => {
    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: undefined,
          organizationId: 'org-1'
        }
      },
      isLoading: false
    } as never);

    render(<ClinicDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('mock-drawer')).toBeDefined();
    });
  });

  it('does not show drawer when no id param (admin on list page)', async () => {
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );

    vi.mocked(useAuth).mockReturnValue({
      state: {
        isAuthenticated: true,
        userInfo: {
          role_name: 'Clinic Admin',
          fhirId: undefined,
          organizationId: 'org-1'
        }
      },
      isLoading: false
    } as never);

    render(<ClinicDetail />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.queryByTestId('mock-drawer')).toBeNull();
    });
  });
});
