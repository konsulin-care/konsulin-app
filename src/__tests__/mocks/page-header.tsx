import { fireEvent } from '@testing-library/react';
import { expect, vi } from 'vitest';

/**
 * Shared vi.mock modules for PageHeader tests. Consumed via dynamic import
 * inside async vi.mock factories (hoisting-safe), e.g.:
 * `vi.mock('@/i18n', async () => ({ ...(await import('@/__tests__/mocks/page-header')).pageHeaderI18nMock }))`.
 */

const translations: Record<string, string> = {
  dashboard: 'Welcome to Konsulin',
  book_session: 'Schedule a Session',
  assessment_center: 'Assessment Center',
  user_profile: 'User Profile',
  recommended: 'Recommendations for You',
  research: 'Research',
  go_back: 'Go back'
};

/** i18n module mock with the PageHeader translation map (falls back to key). */
export const pageHeaderI18nMock = {
  useTranslations: vi.fn(() => (key: string) => translations[key] ?? key)
};

/** next/navigation module mock: pathname '/', empty search params, push/back/replace router. */
export const pageHeaderNavigationMock = {
  usePathname: vi.fn().mockReturnValue('/'),
  useSearchParams: vi.fn().mockReturnValue(new URLSearchParams()),
  useRouter: vi
    .fn()
    .mockReturnValue({ push: vi.fn(), back: vi.fn(), replace: vi.fn() })
};

/**
 * authContext module mock defaulting to an authenticated patient. Tests
 * override per case via `vi.mocked(useAuth).mockReturnValue(...)`.
 */
export const pageHeaderAuthMock = {
  useAuth: vi.fn().mockReturnValue({
    isLoading: false,
    state: {
      isAuthenticated: true,
      userInfo: { role_name: 'Patient', fhirId: 'patient-1' }
    },
    dispatch: vi.fn()
  })
};

/** useUpcomingEvents module mock with no upcoming appointment or session. */
export const upcomingEventsMock = {
  useUpcomingEvents: vi.fn().mockReturnValue({
    appointmentData: null,
    sessionData: null,
    isAuthLoading: false
  })
};

/** indexeddb module mock: uiPreferences store, dbGet resolving null. */
export const indexedDbMock = {
  STORES: { uiPreferences: 'ui_preferences' },
  dbGet: vi.fn().mockResolvedValue(null)
};

/** services/api module mock: getAPI left unconfigured for per-test resolution. */
export const apiMock = {
  getAPI: vi.fn()
};

/** avatar component module mock rendering a testid div. */
export const avatarMock = {
  default: () => <div data-testid='mock-avatar'>Avatar</div>
};

/** AppRouter-shaped spy object shared by PageHeader tests. */
export interface MockRouter {
  push: ReturnType<typeof vi.fn>;
  back: ReturnType<typeof vi.fn>;
  forward: ReturnType<typeof vi.fn>;
  refresh: ReturnType<typeof vi.fn>;
  replace: ReturnType<typeof vi.fn>;
  prefetch: ReturnType<typeof vi.fn>;
  bfcacheId: string;
}

/**
 * Configure the shared next/navigation useRouter mock to return a fresh
 * router spy object.
 * @returns The router mock for asserting push/back calls.
 */
export function setupMockRouter(): MockRouter {
  const router: MockRouter = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    bfcacheId: '0'
  };
  pageHeaderNavigationMock.useRouter.mockReturnValue(router);
  return router;
}

/**
 * Shared test body for the "falls back to router.back button for unknown
 * routes" behavior. Mocks an unknown pathname, renders PageHeader with
 * renderWithQuery, and asserts no back anchor is rendered while the back
 * button calls router.back exactly once without pushing. Dynamic imports
 * keep this module free of static imports of the mocked modules.
 * @param router - Router mock returned by setupMockRouter().
 */
export async function runRouterBackFallbackTest(
  router: MockRouter
): Promise<void> {
  const { usePathname } = await import('next/navigation');
  const { renderWithQuery } = await import('@/__tests__/react-test-utils');
  const { default: PageHeader } = await import('@/components/page-header');

  vi.mocked(usePathname).mockReturnValue('/some-unknown-page');

  renderWithQuery(<PageHeader />);

  const link = document.querySelector('a[aria-label="Go back"]');
  expect(link).toBeNull();

  const button = document.querySelector('button[aria-label="Go back"]');
  expect(button).not.toBeNull();
  fireEvent.click(button as HTMLElement);
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(router.push).not.toHaveBeenCalled();
}
