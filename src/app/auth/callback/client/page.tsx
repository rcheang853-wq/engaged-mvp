'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/supabase/auth';

function safeRedirectPath(path: string | null) {
  if (!path || !path.startsWith('/')) return '/calendars';
  return path;
}

function ClientAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('Finishing sign in...');

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      const code = searchParams?.get('code');
      const redirectTo = safeRedirectPath(searchParams?.get('redirectTo') ?? null);

      if (!code) {
        router.replace('/auth/signin?error=No%20authorization%20code%20received');
        return;
      }

      const result = await authClient.exchangeCodeForSession(code);
      if (!active) return;

      if (!result.success) {
        const error = encodeURIComponent(
          result.error || 'Authentication failed. Please try again.'
        );
        router.replace(`/auth/signin?error=${error}`);
        return;
      }

      await authClient.getCurrentUser();
      router.replace(redirectTo);
    }

    finishAuth().catch(() => {
      if (!active) return;
      setMessage('Something went wrong. Redirecting...');
      router.replace('/auth/signin?error=Authentication%20failed.%20Please%20try%20again.');
    });

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  );
}

export default function ClientAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-gray-600">Finishing sign in...</p>
        </div>
      }
    >
      <ClientAuthCallbackContent />
    </Suspense>
  );
}
