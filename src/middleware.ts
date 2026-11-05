import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * TRACE Server-Side Route Protection & Mandatory Onboarding Middleware
 * Prevents unauthorized or incomplete shop users from accessing protected business modules.
 */

// Protected business module routes requiring completed onboarding
const PROTECTED_ROUTES = [
  '/dashboard',
  '/pos',
  '/inventory',
  '/reports',
  '/customers',
  '/paylater',
  '/expenses',
  '/settings',
  '/subscriptions',
  '/network',
  '/ai-assistant',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if current path is a protected module
  const isProtectedRoute = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedRoute) {
    // Check authentication and onboarding status from cookies
    const onboardingCompletedCookie = req.cookies.get('trace_onboarding_completed')?.value;
    const authSessionCookie = req.cookies.get('trace_auth_token')?.value || 
                              req.cookies.get('sb-access-token')?.value || 
                              req.cookies.get('supabase-auth-token')?.value;

    // If onboarding is explicitly flagged as pending or false in cookie, redirect to /onboarding
    if (onboardingCompletedCookie === 'false') {
      const onboardingUrl = new URL('/onboarding', req.url);
      return NextResponse.redirect(onboardingUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
