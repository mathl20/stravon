import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, getTokenFromRequest, COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/lib/auth-edge';
import { verifyAmbassadorToken, getAmbassadorTokenFromRequest, AMBASSADOR_COOKIE } from '@/lib/ambassador-auth-edge';
import { isAdminEmail } from '@/lib/admin-edge';

const PUBLIC_PATHS = ['/', '/login', '/register', '/demo', '/verify-email', '/forgot-password', '/reset-password', '/mentions-legales', '/cgv'];
const PUBLIC_PREFIXES = ['/sign/', '/api/demo/'];
const AUTH_PATHS = ['/login', '/register'];
// Ambassador public pages (landing, login)
const AMBASSADOR_PUBLIC_PATHS = ['/ambassadeur', '/ambassadeur/login'];
// Ambassador protected dashboard prefix
const AMBASSADOR_DASHBOARD_PREFIX = '/ambassadeur/dashboard';

/**
 * Attempt to refresh the access token using the refresh cookie.
 * Returns the new payload and response cookies if successful, null otherwise.
 */
async function tryRefreshToken(request: NextRequest): Promise<{ payload: { userId: string; email: string; role: string; companyId: string }; setCookieHeaders: string[] } | null> {
  const refreshToken = request.cookies.get(REFRESH_COOKIE_NAME)?.value;
  if (!refreshToken) return null;

  try {
    const refreshUrl = new URL('/api/auth/refresh', request.url);
    const res = await fetch(refreshUrl.toString(), {
      method: 'POST',
      headers: { cookie: request.headers.get('cookie') || '' },
    });

    if (!res.ok) return null;

    // Extract Set-Cookie headers from the refresh response
    const setCookieHeaders = res.headers.getSetCookie?.() || [];

    // Find the new access token from the Set-Cookie headers to verify it
    const sessionCookie = setCookieHeaders.find(c => c.startsWith(`${COOKIE_NAME}=`));
    if (!sessionCookie) return null;

    const newToken = sessionCookie.split('=')[1]?.split(';')[0];
    if (!newToken) return null;

    const payload = await verifyToken(newToken);
    if (!payload) return null;

    return { payload, setCookieHeaders };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, static files, and SEO metadata routes
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.') ||
    pathname === '/sitemap.xml' ||
    pathname === '/robots.txt'
  ) {
    return NextResponse.next();
  }

  // Affiliate link: /?ref=AFF-XXXX → /register?aff=AFF-XXXX
  // Ambassador link: /?ref=AMB-XXXX → /register?amb=AMB-XXXX
  if (pathname === '/') {
    const refParam = request.nextUrl.searchParams.get('ref');
    if (refParam && refParam.startsWith('AFF-')) {
      const registerUrl = new URL('/register', request.url);
      registerUrl.searchParams.set('aff', refParam);
      return NextResponse.redirect(registerUrl);
    }
    if (refParam && refParam.startsWith('AMB-')) {
      const registerUrl = new URL('/register', request.url);
      registerUrl.searchParams.set('amb', refParam);
      return NextResponse.redirect(registerUrl);
    }
  }

  // ── Ambassador routes (separate auth system) ──
  if (pathname.startsWith('/ambassadeur')) {
    // Public ambassador pages
    if (AMBASSADOR_PUBLIC_PATHS.includes(pathname)) {
      // If already authenticated as ambassador, redirect to dashboard
      const ambToken = getAmbassadorTokenFromRequest(request);
      if (ambToken) {
        const ambPayload = await verifyAmbassadorToken(ambToken);
        if (ambPayload && (pathname === '/ambassadeur/login' || pathname === '/ambassadeur')) {
          return NextResponse.redirect(new URL('/ambassadeur/dashboard', request.url));
        }
      }
      return NextResponse.next();
    }

    // Protected ambassador dashboard
    if (pathname.startsWith(AMBASSADOR_DASHBOARD_PREFIX)) {
      const ambToken = getAmbassadorTokenFromRequest(request);
      if (!ambToken) {
        return NextResponse.redirect(new URL('/ambassadeur/login', request.url));
      }
      const ambPayload = await verifyAmbassadorToken(ambToken);
      if (!ambPayload) {
        const response = NextResponse.redirect(new URL('/ambassadeur/login', request.url));
        response.cookies.delete(AMBASSADOR_COOKIE);
        return response;
      }
      return NextResponse.next();
    }

    return NextResponse.next();
  }

  const token = getTokenFromRequest(request);
  let payload = token ? await verifyToken(token) : null;
  let refreshCookieHeaders: string[] = [];

  // Access token expired or invalid — try to refresh silently
  if (!payload) {
    const refreshResult = await tryRefreshToken(request);
    if (refreshResult) {
      payload = refreshResult.payload;
      refreshCookieHeaders = refreshResult.setCookieHeaders;
    } else if (token) {
      // Had a token but it's invalid and refresh failed → clear cookies
      const isPublic = PUBLIC_PATHS.includes(pathname);
      const response = isPublic
        ? NextResponse.next()
        : NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete(COOKIE_NAME);
      response.cookies.delete(REFRESH_COOKIE_NAME);
      return response;
    }
  }

  const isAuthenticated = !!payload;

  // Authenticated user trying to access login/register → redirect to dashboard
  if (isAuthenticated && AUTH_PATHS.includes(pathname)) {
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    for (const h of refreshCookieHeaders) response.headers.append('set-cookie', h);
    return response;
  }

  // Unauthenticated user trying to access protected route
  const isPublicPrefix = PUBLIC_PREFIXES.some(p => pathname.startsWith(p));
  if (!isAuthenticated && !PUBLIC_PATHS.includes(pathname) && !isPublicPrefix) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin route protection — only accessible by admin email
  if (pathname.startsWith('/admin')) {
    if (!payload || !isAdminEmail(payload.email)) {
      const response = NextResponse.redirect(new URL('/dashboard', request.url));
      for (const h of refreshCookieHeaders) response.headers.append('set-cookie', h);
      return response;
    }
  }

  const response = NextResponse.next();
  // Forward refreshed cookies to the browser
  for (const h of refreshCookieHeaders) response.headers.append('set-cookie', h);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|sitemap\\.xml|robots\\.txt).*)'],
};
