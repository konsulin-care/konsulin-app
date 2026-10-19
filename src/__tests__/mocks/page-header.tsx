import { vi } from 'vitest';

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
