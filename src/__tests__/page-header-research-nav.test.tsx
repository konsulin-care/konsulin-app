import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PageHeader from '../components/page-header';

// Hoisted mocks — shared factories from @/__tests__/mocks/page-header
vi.mock('@/i18n', async () => ({
  ...(await import('@/__tests__/mocks/page-header')).pageHeaderI18nMock
}));

vi.mock('next/navigation', async () => ({
  ...(await import('@/__tests__/mocks/page-header')).pageHeaderNavigationMock
}));

vi.mock('@/context/auth/authContext', async () => ({
  ...(await import('@/__tests__/mocks/page-header')).pageHeaderAuthMock
}));

vi.mock('@/hooks/useUpcomingEvents', async () => ({
  ...(await import('@/__tests__/mocks/page-header')).upcomingEventsMock
}));

vi.mock('@/lib/indexeddb', async () => ({
  ...(await import('@/__tests__/mocks/page-header')).indexedDbMock
}));

vi.mock('@/services/api', async () => ({
  ...(await import('@/__tests__/mocks/page-header')).apiMock
}));

vi.mock('@/components/general/avatar', async () => ({
  ...(await import('@/__tests__/mocks/page-header')).avatarMock
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
    fireEvent.click(button as HTMLElement);
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
