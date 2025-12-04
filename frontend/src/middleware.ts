import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Advanced Middleware for PMS Route Protection
 *
 * Security Features:
 * - Server-side authentication verification
 * - Secure headers (CSP, X-Frame-Options, etc.)
 * - PMS route authentication with Django backend validation
 * - Audit logging for sensitive operations
 * - Protection against client-side auth bypass
 */

// Declare process for environment variables (Next.js inlines these at build time)
declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

// Get API URL from environment variable
const DJANGO_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

async function verifyAuthentication(request: NextRequest): Promise<{ authenticated: boolean; isTeamMember: boolean }> {
  try {
    const sessionCookie = request.cookies.get('sessionid');
    const csrfCookie = request.cookies.get('csrftoken');

    if (!sessionCookie) {
      return { authenticated: false, isTeamMember: false };
    }

    // Verify session with Django backend
    const response = await fetch(`${DJANGO_API_URL}/auth/me/`, {
      method: 'GET',
      headers: {
        'Cookie': `sessionid=${sessionCookie.value}${csrfCookie ? `; csrftoken=${csrfCookie.value}` : ''}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return { authenticated: false, isTeamMember: false };
    }

    const userData = await response.json();
    const isTeamMember = userData.is_team_member || userData.is_super_admin;

    return { authenticated: true, isTeamMember };
  } catch (error) {
    console.error('Auth verification error in middleware:', error);
    return { authenticated: false, isTeamMember: false };
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // PMS Route Protection - Server-side authentication check
  if (pathname.startsWith('/pms')) {
    const { authenticated, isTeamMember } = await verifyAuthentication(request);

    // Redirect unauthorized users to login
    if (!authenticated || !isTeamMember) {
      const loginUrl = new URL('/auth/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);

      const response = NextResponse.redirect(loginUrl);

      // Add security headers
      response.headers.set('X-Auth-Required', 'true');
      response.headers.set('X-Redirect-Reason', !authenticated ? 'not-authenticated' : 'insufficient-permissions');

      return response;
    }

    // User is authenticated and authorized - add audit headers
    const response = NextResponse.next();
    response.headers.set('X-PMS-Access-Time', new Date().toISOString());
    response.headers.set('X-PMS-Session-ID', crypto.randomUUID());
    response.headers.set('X-Authenticated', 'true');

    // Add security headers for PMS routes
    addSecurityHeaders(response, true);

    return response;
  }

  // Apply standard security headers to all other routes
  const response = NextResponse.next();
  addSecurityHeaders(response, false);

  return response;
}

function addSecurityHeaders(response: NextResponse, isPMSRoute: boolean) {
  // Apply security headers to all routes
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Enhanced security for PMS routes
  if (isPMSRoute) {
    // Add stricter CSP for PMS
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https:;"
    );

    // Add HSTS (HTTP Strict Transport Security)
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // Prevent MIME type sniffing
    response.headers.set('X-Download-Options', 'noopen');

    // Additional PMS-specific security
    response.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  }
}

// Configure which routes to apply middleware to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
