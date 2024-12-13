import { type NextRequest } from 'next/server'

const patientAndClinicianRoutes = [
  '/message',
  '/notification',
  '/profile',
  '/journal',
  '/record'
]
const patientRoutes = [/^\/exercise\/.*/]
// const patientRoutes = [/^\/exercise\/.*/]
const clinicianRoutes = ['/assessment/soap']

export function middleware(request: NextRequest) {
  /**
   * use this for callback redirect
   * const url = request.nextUrl.clone
   *
   */

  //

  const auth = JSON.parse(request.cookies.get('auth')?.value || '{}')
  const { pathname } = request.nextUrl

  const routeMatches = (routes: (string | RegExp)[], path: string) =>
    routes.some(route =>
      route instanceof RegExp ? route.test(path) : route === path
    )

  if (
    (auth.role_name !== 'patient' && routeMatches(patientRoutes, pathname)) || // patient only
    (auth.role_name !== 'cilinician' &&
      routeMatches(clinicianRoutes, pathname)) || // cliniciant only
    ((!auth.role_name || auth.role_name === 'guest') &&
      routeMatches(patientAndClinicianRoutes, pathname)) // patient and cliniciant
  ) {
    return Response.redirect(new URL('/register', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
}
