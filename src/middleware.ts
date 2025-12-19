import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession = request.cookies.get('sAccessToken');

  // Protect authenticated routes
  if (!hasSession && pathname.startsWith('/')) {
    if (!pathname.startsWith('/auth')) {
      const url = new URL('/auth', request.url);
      url.searchParams.set('returnUrl', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Prevent logged-in users from accessing auth pages
  if (hasSession && pathname.startsWith('/auth')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
};
