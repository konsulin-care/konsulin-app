import { setupMockRouter } from '@/__tests__/mocks/page-header';
import { renderWithQuery } from '@/__tests__/react-test-utils';
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

import { usePathname, useSearchParams } from 'next/navigation';

describe('PageHeader - research form page navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePathname).mockReturnValue('/research/register');
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams() as unknown as ReturnType<typeof useSearchParams>
    );
  });

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

      renderWithQuery(<PageHeader />);

      const link = document.querySelector('a[aria-label="Go back"]');
      expect(link).toHaveAttribute('href', expectedHref);
    }
  );

  // The "falls back to router.back button for unknown routes" behavior is
  // asserted in page-header.test.tsx via the shared runRouterBackFallbackTest.

  it('chevron icon is hidden from assistive technology', () => {
    setupMockRouter();
    vi.mocked(useSearchParams).mockReturnValue(
      new URLSearchParams('page=title') as unknown as ReturnType<
        typeof useSearchParams
      >
    );

    renderWithQuery(<PageHeader />);

    const icon = document.querySelector('.lucide-chevron-left');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
