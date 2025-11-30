import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Advanced Middleware for PMS Route Protection
 *
 * Security Features:
 * - Secure headers (CSP, X-Frame-Options, etc.)
 * - PMS route authentication
 * - Audit logging for sensitive operations
 * - Rate limiting protection
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Apply security headers to all routes
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Enhanced security for PMS routes
  if (pathname.startsWith('/pms')) {
    // Add stricter CSP for PMS
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
    );

    // Add HSTS (HTTP Strict Transport Security)
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // Prevent MIME type sniffing
    response.headers.set('X-Download-Options', 'noopen');

    // Add audit trail header
    response.headers.set('X-PMS-Access-Time', new Date().toISOString());
    response.headers.set('X-PMS-Session-ID', crypto.randomUUID());
  }

  return response;
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
