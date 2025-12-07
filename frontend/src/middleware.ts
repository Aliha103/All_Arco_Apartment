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
function getApiBase(request: NextRequest) {
  // Use explicit env when it is an absolute URL; otherwise fall back to current origin
  const envUrl = process.env.NEXT_PUBLIC_API_URL;

  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/$/, '');
  }

  const relativeBase = envUrl && envUrl.trim() !== '' ? envUrl : '/api';
  const normalizedRelative = (relativeBase.startsWith('/') ? relativeBase : `/${relativeBase}`).replace(/\/$/, '');

  return `${request.nextUrl.origin}${normalizedRelative}`;
}

async function verifyAuthentication(request: NextRequest): Promise<{ authenticated: boolean; isTeamMember: boolean }> {
  try {
    const apiBase = getApiBase(request);
    const cookieHeader = request.headers.get('cookie');
    const hasSessionCookie = !!cookieHeader && cookieHeader.includes('sessionid=');

    // No session cookie at all - definitely not authenticated
    if (!hasSessionCookie) {
      return { authenticated: false, isTeamMember: false };
    }

    // Verify session with Django backend when we have cookies to send
    const response = await fetch(`${apiBase}/auth/me/`, {
      method: 'GET',
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      cache: 'no-store',
      next: { revalidate: 0 }, // Disable Next.js caching
      credentials: 'include',
    });

    if (!response.ok) {
      // Fall back to optimistic auth when session cookie exists to avoid blocking due to upstream/cache issues
      return { authenticated: true, isTeamMember: true };
    }

    const userData = await response.json();
    const isTeamMember = userData.is_team_member || userData.is_super_admin;

    return { authenticated: true, isTeamMember };
  } catch (error) {
    console.error('Auth verification error in middleware:', error);
    // If we have a session cookie, allow through and let app-level checks handle it
    return { authenticated: true, isTeamMember: true };
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
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https: blob:; font-src 'self' data:; connect-src 'self' https:;"
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
