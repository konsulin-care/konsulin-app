import { type NextRequest } from 'next/server';

const patientAndClinicianRoutes = [
  '/message',
  '/notification',
  '/profile',
  '/journal',
  '/record'
];
const patientRoutes = [];
// const patientRoutes = [/^\/exercise\/.*/]
const clinicianRoutes = ['/assessments/soap'];

export function middleware(request: NextRequest) {
  /**
   * use this for callback redirect
   * const url = request.nextUrl.clone
   *
   */

  //

  const auth = JSON.parse(request.cookies.get('auth')?.value || '{}');
  const { pathname } = request.nextUrl;

  const routeMatches = (routes: (string | RegExp)[], path: string) =>
    routes.some(route =>
      route instanceof RegExp ? route.test(path) : route === path
    );

  // unauthenticated user can't access private routes
  if (
    Object.keys(auth).length === 0 &&
    routeMatches(
      [...patientRoutes, clinicianRoutes, ...patientAndClinicianRoutes],
      pathname
    )
  ) {
    // return Response.redirect(new URL('/register?role=patient', request.url))
    return Response.redirect(new URL('/auth', request.url));
  }

  // if (auth.token && routeMatches(['/login', '/register'], pathname)) {
  //   return Response.redirect(new URL('/', request.url))
  // }

  // authenticated user can't access login and register page
  if (auth.userId && routeMatches(['/auth'], pathname)) {
    return Response.redirect(new URL('/', request.url));
  }

  // authorization base on role
  if (
    (auth.role_name !== 'Patient' && routeMatches(patientRoutes, pathname)) || // patient only
    (auth.role_name !== 'Practitioner' &&
      routeMatches(clinicianRoutes, pathname)) || // cliniciant only
    ((!auth.role_name || auth.role_name === 'guest') &&
      routeMatches(patientAndClinicianRoutes, pathname)) // patient and cliniciant
  ) {
    return Response.redirect(new URL('/unauthorized', request.url));
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
};
