import { Roles } from '@/constants/roles';
import { type NextRequest } from 'next/server';

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */
const isProfileComplete = (auth: any) => auth?.profileComplete === true;

const patientAndClinicianRoutes = [
  '/message',
  '/notification',
  '/journal',
  '/record'
];

const clinicianRoutes = ['/assessments/soap'];

/* -------------------------------------------------------------------------- */
/* Middleware                                                                 */
/* -------------------------------------------------------------------------- */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ---------------------------------------------------------------------- */
  /* Decode auth cookie safely                                               */
  /* ---------------------------------------------------------------------- */
  const rawAuth = request.cookies.get('auth')?.value;

  let auth: any = {};
  try {
    auth = rawAuth ? JSON.parse(decodeURIComponent(rawAuth)) : {};
  } catch {
    auth = {};
  }

  const routeMatches = (routes: (string | RegExp)[], path: string) =>
    routes.some(route =>
      route instanceof RegExp ? route.test(path) : route === path
    );

  /* ---------------------------------------------------------------------- */
  /* Unauthenticated user protection                                        */
  /* ---------------------------------------------------------------------- */
  if (
    Object.keys(auth).length === 0 &&
    routeMatches([...patientAndClinicianRoutes, ...clinicianRoutes], pathname)
  ) {
    const url = new URL('/auth', request.url);
    url.searchParams.set('returnUrl', pathname + request.nextUrl.search);
    return Response.redirect(url);
  }

  /* ---------------------------------------------------------------------- */
  /* Authenticated user can't access auth page                               */
  /* ---------------------------------------------------------------------- */
  if (auth.userId && routeMatches(['/auth'], pathname)) {
    return Response.redirect(new URL('/', request.url));
  }

  /* ---------------------------------------------------------------------- */
  /* Role-based authorization                                                */
  /* ---------------------------------------------------------------------- */
  if (
    (auth.role_name !== Roles.Practitioner &&
      routeMatches(clinicianRoutes, pathname)) ||
    ((!auth.role_name || auth.role_name === 'guest') &&
      routeMatches(patientAndClinicianRoutes, pathname))
  ) {
    return Response.redirect(new URL('/unauthorized', request.url));
  }

  /* ---------------------------------------------------------------------- */
  /* 🔥 Issue #272 — Profile completeness enforcement (PATIENT ONLY)        */
  /* ---------------------------------------------------------------------- */
  if (
    auth.role_name === Roles.Patient &&
    !isProfileComplete(auth) &&
    !pathname.startsWith('/profile') &&
    !pathname.startsWith('/auth')
  ) {
    return Response.redirect(new URL('/profile', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
};
