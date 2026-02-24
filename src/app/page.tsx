'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function Home() {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    window.location.href = isAuthenticated ? '/calendars' : '/auth/signin';
  }, [isLoading, isAuthenticated]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
        <p className="text-gray-600">Loading…</p>
      </div>
    </div>
  );
}
