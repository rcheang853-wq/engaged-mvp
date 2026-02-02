'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  allowedRoles?: string[];
}

export function ProtectedRoute({
  children,
  fallback,
  redirectTo = '/auth/signin',
  requireAuth = true,
  allowedRoles = [],
}: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading, isInitialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only check auth after initialization is complete
    if (!isInitialized || isLoading) return;

    if (requireAuth && !isAuthenticated) {
      // Redirect to signin with return URL
      const currentPath = window.location.pathname;
      const redirectUrl = new URL(redirectTo, window.location.origin);

      if (currentPath !== '/') {
        redirectUrl.searchParams.set('redirectTo', currentPath);
      }

      router.replace(redirectUrl.toString());
      return;
    }

    // Check role-based access (if roles are specified)
    if (allowedRoles.length > 0 && user) {
      // For now, we only have isPro as a role indicator
      // This can be extended based on your role system
      const hasAccess = user.isPro || allowedRoles.includes('free');

      if (!hasAccess) {
        router.replace('/unauthorized');
        return;
      }
    }
  }, [isAuthenticated, isLoading, isInitialized, requireAuth, allowedRoles, user, router, redirectTo]);

  // Show loading state while initializing or checking auth
  if (!isInitialized || isLoading) {
    return (
      fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      )
    );
  }

  // Don't render anything if redirecting
  if (requireAuth && !isAuthenticated) {
    return null;
  }

  // Render children if all checks pass
  return <>{children}</>;
}

// Convenience wrapper for pages that require authentication
export function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <WrappedComponent {...props} />
      </ProtectedRoute>
    );
  };
}

export default ProtectedRoute;