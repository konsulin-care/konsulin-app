import { type NextRequest, NextResponse } from 'next/server';

/* -------------------------------------------------------------------------- */
/* Routes                                                                      */
/* -------------------------------------------------------------------------- */
const protectedRoutes = [
  '/message',
  '/notification',
  '/journal',
  '/record',
  '/assessments/soap'
];

/* -------------------------------------------------------------------------- */
/* Middleware                                                                  */
/* -------------------------------------------------------------------------- */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /* ---------------------------------------------------------------------- */
  /* Read auth cookie (DO NOT TRUST CONTENT)                                 */
  /* ---------------------------------------------------------------------- */
  const rawAuth = request.cookies.get('auth')?.value;
  const isAuthenticated = Boolean(rawAuth);

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  );

  /* ---------------------------------------------------------------------- */
  /* Unauthenticated user protection                                        */
  /* ---------------------------------------------------------------------- */
  if (!isAuthenticated && isProtectedRoute) {
    const url = new URL('/auth', request.url);
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }

  /* ---------------------------------------------------------------------- */
  /* Authenticated users should not access /auth                            */
  /* ---------------------------------------------------------------------- */
  if (isAuthenticated && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

/* -------------------------------------------------------------------------- */
/* Matcher                                                                    */
/* -------------------------------------------------------------------------- */
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
};
