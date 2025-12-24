import { Roles } from '@/constants/roles';
import { type NextRequest } from 'next/server';

const patientAndClinicianRoutes = [
  '/message',
  '/notification',
  '/journal',
  '/record'
];

const clinicianRoutes = ['/assessments/soap'];

export function middleware(request: NextRequest) {
  const auth = JSON.parse(request.cookies.get('auth')?.value || '{}');
  const { pathname } = request.nextUrl;

  const routeMatches = (routes: (string | RegExp)[], path: string) =>
    routes.some(route =>
      route instanceof RegExp ? route.test(path) : route === path
    );

  if (
    !auth?.userId &&
    routeMatches([...patientAndClinicianRoutes, ...clinicianRoutes], pathname)
  ) {
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
