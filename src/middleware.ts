import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromRequest, COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = ['/', '/login', '/register', '/demo', '/verify-email', '/forgot-password', '/reset-password', '/mentions-legales', '/cgv'];
const PUBLIC_PREFIXES = ['/sign/', '/api/demo/'];
const AUTH_PATHS = ['/login', '/register'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes and static files
  if (pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/uploads') || pathname.includes('.')) {
    return NextResponse.next();
  }

  const token = getTokenFromRequest(request);
  const payload = token ? await verifyToken(token) : null;

  // Token present but invalid → clear it and treat as unauthenticated
  if (token && !payload) {
    const response = PUBLIC_PATHS.includes(pathname)
      ? NextResponse.next()
      : NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(COOKIE_NAME);
    return response;
  }

  const isAuthenticated = !!payload;

  // Authenticated user trying to access login/register → redirect to dashboard
  if (isAuthenticated && AUTH_PATHS.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Unauthenticated user trying to access protected route
  const isPublicPrefix = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
  if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname) && !isPublicPrefix) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
