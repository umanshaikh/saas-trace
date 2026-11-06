import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * TRACE Server-Side Route Protection & Mandatory Membership Middleware
 * Prevents unauthorized, incomplete, or non-subscribed shops from accessing protected business modules.
 */

// Protected business modules requiring completed onboarding & active membership
const PROTECTED_BUSINESS_ROUTES = [
  '/dashboard',
  '/pos',
  '/inventory',
  '/reports',
  '/customers',
  '/paylater',
  '/expenses',
  '/settings',
  '/network',
  '/ai-assistant',
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if current path is a protected module
  const isProtectedModule = PROTECTED_BUSINESS_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (isProtectedModule) {
    const onboardingCompleted = req.cookies.get('trace_onboarding_completed')?.value;
    const subscriptionActive = req.cookies.get('trace_subscription_active')?.value;

    // 1. Mandatory Onboarding Enforcement: If incomplete, redirect to /onboarding
    if (onboardingCompleted === 'false') {
      const onboardingUrl = new URL('/onboarding', req.url);
      return NextResponse.redirect(onboardingUrl);
    }

    // 2. Mandatory Active Membership Enforcement: If subscription inactive/expired, redirect to /subscriptions
    if (subscriptionActive === 'false') {
      const subscriptionUrl = new URL('/subscriptions?required=true', req.url);
      return NextResponse.redirect(subscriptionUrl);
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
