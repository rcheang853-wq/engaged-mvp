import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/auth';

// Define protected and public routes
const protectedRoutes = [
  '/calendar',
];

const authRoutes = [
  '/auth/signin',
  '/auth/signup',
  '/auth/reset-password',
];

const publicRoutes = [
  '/',
  '/e',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Create response with security headers
  const response = NextResponse.next();
  addSecurityHeaders(response, request);

  // Allow all API routes except protected ones to pass through
  if (pathname.startsWith('/api/')) {
    // Check if it's a protected API route
    if (pathname.startsWith('/api/protected/') ||
        pathname.startsWith('/api/user/') ||
        pathname.startsWith('/api/subscription/')) {
      return await handleProtectedRoute(request);
    }
    return response;
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/images/') ||
    pathname.startsWith('/icons/') ||
    pathname.includes('.')
  ) {
    return response;
  }

  // Handle auth routes (redirect authenticated users away)
  if (isAuthRoute(pathname)) {
    return await handleAuthRoute(request);
  }

  // Handle protected routes (require authentication)
  if (isProtectedRoute(pathname)) {
    return await handleProtectedRoute(request);
  }

  // Allow public routes
  return response;
}

function addSecurityHeaders(response: NextResponse, request: NextRequest) {
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // CSP (Content Security Policy)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://js.stripe.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' https://api.supabase.com https://www.google-analytics.com https://api.stripe.com",
    "frame-src 'self' https://js.stripe.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  // HSTS (HTTP Strict Transport Security)
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  // Cache control for static assets
  if (request.nextUrl.pathname.startsWith('/_next/static/')) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  }

  // Cache control for images
  if (request.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|webp|ico)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=86400');
  }

  // Rate limiting headers
  const ip = request.ip || request.headers.get('x-forwarded-for') || 'unknown';
  response.headers.set('X-Client-IP', ip);

  // Security headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('X-API-Version', '1.0');
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Access-Control-Allow-Origin', 'https://engaged-app.com');
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Redirect www to non-www in production
  if (process.env.NODE_ENV === 'production' && request.nextUrl.hostname.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.hostname = url.hostname.replace('www.', '');
    return NextResponse.redirect(url, 301);
  }

  // Block potentially harmful requests
  const suspiciousPatterns = [
    /\/\.env/,
    /\/wp-admin/,
    /\/admin\.php/,
    /\/xmlrpc\.php/,
    /\/phpmyadmin/,
    /\/\.git/,
    /\/\.ssh/,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(request.nextUrl.pathname)) {
      return new NextResponse('Not Found', { status: 404 });
    }
  }

  // Add performance timing headers
  const startTime = Date.now();
  response.headers.set('Server-Timing', `middleware;dur=${startTime}`);
}

async function handleProtectedRoute(request: NextRequest): Promise<NextResponse> {
  try {
    const response = NextResponse.next();
    addSecurityHeaders(response, request);
    const supabase = createMiddlewareSupabaseClient(request, response);

    // Get the authenticated user (validated by Supabase)
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      // Redirect to signin with return URL
      const redirectUrl = new URL('/auth/signin', request.url);
      redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);

    // On error, redirect to signin
    const redirectUrl = new URL('/auth/signin', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
}

async function handleAuthRoute(request: NextRequest): Promise<NextResponse> {
  try {
    const response = NextResponse.next();
    addSecurityHeaders(response, request);
    const supabase = createMiddlewareSupabaseClient(request, response);

    // A verified user means the session is valid
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // User is authenticated, redirect to calendar or return URL
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/calendar';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    return response;
  } catch (error) {
    console.error('Auth route middleware error:', error);
    const response = NextResponse.next();
    addSecurityHeaders(response, request);
    return response;
  }
}

function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isAuthRoute(pathname: string): boolean {
  return authRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  );
}

// Configure which paths this middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.json|sw.js|icon-).*)',
  ],
};
