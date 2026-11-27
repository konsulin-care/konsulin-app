import { Roles } from '@/constants/roles';

/** Routes that keep the current path as back target when they carry params. */
const MAIN_ROUTES = new Set([
  '/clinic',
  '/record',
  '/assessments',
  '/profile',
  '/recommendation',
  '/schedule',
  '/research',
  '/dashboard'
]);

/** Roles whose home path '/' renders the research page. */
const RESEARCH_HOME_ROLES = new Set<string>([
  Roles.Patient,
  Roles.Guest,
  Roles.Researcher
]);

/** Route to translation key map for the header page indicator. */
const INDICATOR_KEYS: Record<string, string> = {
  '/dashboard': 'dashboard',
  '/assessments': 'assessment_center',
  '/profile': 'user_profile',
  '/recommendation': 'recommended',
  '/research': 'research',
  '/study': 'study_title',
  '/studies': 'studies_title'
};

/** Strips a single trailing slash, leaving the root path untouched. */
export function normalizePathname(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname;
}

/**
 * Returns true when the current user sees the research page on '/'.
 * Unauthenticated visitors also land on the research home.
 */
export function isResearchHome(
  pathname: string,
  role: string | undefined,
  isAuthenticated: boolean
): boolean {
  if (pathname !== '/') return false;
  if (!isAuthenticated) return true;
  return RESEARCH_HOME_ROLES.has(role ?? '');
}

/** Returns the page title based on current route. */
export function getPageIndicator(
  pathname: string,
  searchParams: URLSearchParams,
  t: (key: string) => string,
  researchHome: boolean
): string | null {
  if (pathname === '/') return researchHome ? t('research') : t('dashboard');
  if (pathname === '/clinic') {
    return searchParams.has('id') ? null : t('book_session');
  }
  const key = INDICATOR_KEYS[pathname];
  return key ? t(key) : '';
}

/** Resolves the display name, falling back to email for placeholder values. */
export function getDisplayName(
  userInfo: { fullname?: string; email?: string } | undefined
): string | undefined {
  if (!userInfo?.fullname || userInfo.fullname.trim() === '-') {
    return userInfo?.email;
  }
  return userInfo?.fullname;
}

/** Returns true when the header reminder cards are suppressed for the route. */
export function shouldHideSessionCard(
  pathname: string,
  researchHome: boolean,
  hideUpcomingSession: boolean | undefined
): boolean {
  return (
    (hideUpcomingSession ?? false) || pathname === '/research' || researchHome
  );
}

/** Determines the default back navigation route. */
export function getDefaultBackRoute(
  pathname: string,
  searchParams: URLSearchParams
): string | undefined {
  if (pathname === '/') return undefined;

  if (pathname === '/research/register' || pathname === '/research/edit') {
    const page = searchParams.get('page');
    if (page === 'batch' || page === 'questionnaire') {
      const params = new URLSearchParams(searchParams);
      params.set('page', page === 'batch' ? 'questionnaire' : 'title');
      return `${pathname}?${params.toString()}`;
    }
    return '/';
  }

  if (pathname === '/study') return '/studies';
  if (pathname === '/studies') return '/';
  if (pathname === '/report') {
    const id = searchParams.get('id');
    return id ? `/study?id=${encodeURIComponent(id)}` : '/studies';
  }

  if (MAIN_ROUTES.has(pathname)) {
    return searchParams.toString() ? pathname : '/';
  }
  return undefined;
}
