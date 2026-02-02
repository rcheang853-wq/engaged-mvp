import { createMiddlewareSupabaseClient } from '@/lib/supabase/auth';
import { NextRequest, NextResponse } from 'next/server';

// Define protected and auth routes
const protectedRoutes = ['/calendar'];

const authRoutes = ['/auth/signin', '/auth/signup', '/auth/reset-password'];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;

  try {
    // Create Supabase client for middleware
    const supabase = createMiddlewareSupabaseClient(request, response);

    // Get the current session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error('Middleware auth error:', error);
    }

    const isAuthenticated = !!session?.user;
    const isProtectedRoute = protectedRoutes.some((route) =>
      pathname.startsWith(route)
    );
    const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

    // Redirect authenticated users away from auth pages
    if (isAuthenticated && isAuthRoute) {
      const redirectTo = request.nextUrl.searchParams.get('redirectTo') || '/calendar';
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    // Allow public share pages without auth
    if (pathname.startsWith('/e/')) {
      return response;
    }

    // Redirect unauthenticated users from protected routes to signin
    if (!isAuthenticated && isProtectedRoute) {
      const signinUrl = new URL('/auth/signin', request.url);
      signinUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(signinUrl);
    }

    return response;
  } catch (error) {
    console.error('Middleware error:', error);
    // On error, allow the request to proceed
    return response;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
