'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SignUpForm } from '@/components/auth';
import Link from 'next/link';
import { useEffect, Suspense } from 'react';

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const redirectTo = searchParams?.get('redirectTo') || '/calendars';

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  const handleSuccess = () => {
    // On successful signup, user may need email confirmation
    // Let the form handle the success message and next steps
    // If auth is successful immediately, this will redirect via useEffect
  };

  const handleSignIn = () => {
    const signInUrl = new URL('/auth/signin', window.location.origin);
    if (redirectTo !== '/calendars') {
      signInUrl.searchParams.set('redirectTo', redirectTo);
    }
    router.push(signInUrl.toString());
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the form if user is authenticated (will redirect)
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-blue-500 tracking-tight">
            Engaged
          </Link>
          <p className="mt-2 text-sm text-gray-500">Create your shared calendar in minutes.</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-md border border-gray-100 sm:rounded-2xl sm:px-10 ring-1 ring-black/5">
          <SignUpForm
            onSuccess={handleSuccess}
            onSignIn={handleSignIn}
            redirectTo={redirectTo}
          />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={handleSignIn}
              className="font-medium text-blue-500 hover:text-blue-600 transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  );
}


