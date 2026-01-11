import { Roles } from '@/constants/roles';
import { type NextRequest } from 'next/server';

interface AuthCookie {
  userId?: string;
  role_name?: string;
  email?: string;
  fullname?: string;
  profile_picture?: string;
  fhirId?: string;
  profile_complete?: boolean;
}

const patientAndClinicianRoutes = [
  '/message',
  '/notification',
  '/journal',
  '/record',
  '/profile',
  /^\/profile(\/.*)?$/
];

const clinicianRoutes = ['/assessments/soap'];

export function middleware(request: NextRequest) {
  const authCookie = request.cookies.get('auth')?.value;
  let auth: AuthCookie = {};

  // Try to parse cookie, but handle errors gracefully
  try {
    auth = authCookie ? JSON.parse(authCookie) : {};
  } catch (e) {
    console.error('Failed to parse auth cookie:', e);
    auth = {};
  }

  // Check for SuperTokens session tokens as fallback
  const hasSuperTokensSession =
    request.cookies.get('sAccessToken')?.value ||
    request.cookies.get('sRefreshToken')?.value;

  const { pathname } = request.nextUrl;

  const routeMatches = (routes: (string | RegExp)[], path: string) =>
    routes.some(route =>
      route instanceof RegExp ? route.test(path) : route === path
    );

  if (
    !auth?.userId &&
    routeMatches([...patientAndClinicianRoutes, ...clinicianRoutes], pathname)
  ) {
    // If no auth cookie but SuperTokens session exists, allow access
    // Let the client-side auth context handle the full authentication
    if (hasSuperTokensSession) {
      return;
    }

    const url = new URL('/auth', request.url);
    url.searchParams.set('returnUrl', pathname + request.nextUrl.search);
    return Response.redirect(url);
  }

  /**
   * 2️⃣ Authenticated users → cannot access /auth
   */
  if (auth?.userId && routeMatches(['/auth'], pathname)) {
    return Response.redirect(new URL('/', request.url));
  }

  if (
    (auth.role_name !== Roles.Practitioner &&
      routeMatches(clinicianRoutes, pathname)) ||
    ((!auth.role_name || auth.role_name === 'guest') &&
      routeMatches(patientAndClinicianRoutes, pathname))
  ) {
    return Response.redirect(new URL('/unauthorized', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
};
