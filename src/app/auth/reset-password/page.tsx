'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { PasswordResetForm } from '@/components/auth';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/supabase/auth';

type ResetMode = 'request' | 'reset';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<ResetMode>('request');
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isCheckingRecovery, setIsCheckingRecovery] = useState(false);

  useEffect(() => {
    const code = searchParams?.get('code');
    const typeFromQuery = searchParams?.get('type');
    const errorDescription = searchParams?.get('error_description');
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    const hashParams = hash ? new URLSearchParams(hash.replace('#', '')) : null;
    const typeFromHash = hashParams?.get('type');
    const errorFromHash = hashParams?.get('error_description');
    const errorMessage = errorDescription || errorFromHash;
    const hasRecovery = !errorMessage && (typeFromQuery === 'recovery' || typeFromHash === 'recovery' || !!code);

    if (errorMessage) {
      setRecoveryError(decodeURIComponent(errorMessage.replace(/\+/g, ' ')));
    }

    setRecoveryCode(code);
    setIsRecoveryFlow(hasRecovery);
    setMode(hasRecovery ? 'reset' : 'request');
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && isAuthenticated && !isRecoveryFlow) {
      router.replace('/calendar');
    }
  }, [isAuthenticated, isLoading, isRecoveryFlow, router]);

  useEffect(() => {
    if (!isRecoveryFlow) return;

    let isActive = true;

    const verifyRecoverySession = async () => {
      setIsCheckingRecovery(true);
      setRecoveryError(null);

      if (recoveryCode) {
        const exchangeResult = await authClient.exchangeCodeForSession(recoveryCode);
        if (!exchangeResult.success) {
          if (isActive) {
            setRecoveryError(exchangeResult.error || 'Invalid recovery link.');
            setMode('request');
            setIsRecoveryFlow(false);
          }
          setIsCheckingRecovery(false);
          return;
        }

        router.replace('/auth/reset-password');
      }

      const { data: { session } } = await authClient.getSession();

      if (!session && isActive) {
        setRecoveryError('Your password reset link is invalid or has expired. Please request a new one.');
        setMode('request');
        setIsRecoveryFlow(false);
      }

      if (isActive) {
        setIsCheckingRecovery(false);
      }
    };

    void verifyRecoverySession();

    return () => {
      isActive = false;
    };
  }, [isRecoveryFlow, recoveryCode, router]);

  const handleBackToSignIn = () => {
    router.push('/auth/signin');
  };

  // Show loading state while checking authentication
  if (isLoading || isCheckingRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render the form if user is authenticated (will redirect)
  if (isAuthenticated && !isRecoveryFlow) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Engaged
          </Link>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {recoveryError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-800">{recoveryError}</p>
                </div>
              </div>
            </div>
          )}

          <PasswordResetForm
            mode={mode}
            onSuccess={handleBackToSignIn}
            onBackToSignIn={handleBackToSignIn}
          />
        </div>
      </div>
    </div>
  );
}
