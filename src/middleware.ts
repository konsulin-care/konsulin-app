import { type NextRequest } from 'next/server'

const patientAndClinicianRoutes = ['/profile']
const patientRoutes = ['/clinic', '/journal']
const clinicianRoutes = []

export function middleware(request: NextRequest) {
  const auth = JSON.parse(request.cookies.get('auth')?.value || '[]')
  const url = request.nextUrl.clone()
  const { pathname } = request.nextUrl

  if (
    (auth.role_name !== 'patient' && patientRoutes.includes(pathname)) ||
    (auth.role_name !== 'cilinician' && clinicianRoutes.includes(pathname)) ||
    (auth.role_name === 'guest' && patientAndClinicianRoutes.includes(pathname))
  ) {
    return Response.redirect(new URL('/register', request.url))
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
}
