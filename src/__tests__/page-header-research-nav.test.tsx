import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../components/page-header';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn().mockReturnValue('/'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  useRouter: vi.fn().mockReturnValue({ push: vi.fn(), back: vi.fn() })
}));

vi.mock('@/context/auth/authContext', () => ({
  useAuth: vi.fn().mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: 'Patient', fhirId: 'patient-1' }
    }
  })
}));

vi.mock('@/hooks/useUpcomingEvents', () => ({
  useUpcomingEvents: vi.fn().mockReturnValue({
    appointmentData: null,
    sessionData: null
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
  default: () => <div>Avatar</div>
}));

describe('PageHeader - research form page navigation', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    });
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/research/register');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
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
      prefetch: vi.fn()
    };
    vi.mocked(useRouter).mockReturnValue(router as never);
    return router;
  }

  it.each([
    [
      '/research/register',
      'page=batch',
      '/research/register?page=questionnaire'
    ],
    [
      '/research/register',
      'page=questionnaire',
      '/research/register?page=title'
    ],
    ['/research/register', 'page=title', '/research'],
    [
      '/research/edit',
      'id=study-123&page=batch',
      '/research/edit?id=study-123&page=questionnaire'
    ],
    [
      '/research/edit',
      'id=study-456&page=questionnaire',
      '/research/edit?id=study-456&page=title'
    ]
  ])(
    'navigates from %s?%s to %s via anchor href',
    (pathname, search, expectedHref) => {
      setupMockRouter();
      vi.mocked(usePathname).mockReturnValue(pathname);
      vi.mocked(useSearchParams).mockReturnValue(
        new URLSearchParams(search) as unknown as ReturnType<
          typeof useSearchParams
        >
      );

      render(<PageHeader />, { wrapper });

      const link = document.querySelector('a[aria-label="Go back"]');
      expect(link).toHaveAttribute('href', expectedHref);
    }
  );

  it('falls back to router.back button for unknown routes', () => {
    const router = setupMockRouter();
    vi.mocked(usePathname).mockReturnValue('/some-unknown-page');

    render(<PageHeader />, { wrapper });

    const link = document.querySelector('a[aria-label="Go back"]');
    expect(link).toBeNull();

    const button = document.querySelector('button[aria-label="Go back"]');
    expect(button).not.toBeNull();
    fireEvent.click(button!);
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it('chevron icon is hidden from assistive technology', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    render(<PageHeader />, { wrapper });

    const icon = document.querySelector('.lucide-chevron-left');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
