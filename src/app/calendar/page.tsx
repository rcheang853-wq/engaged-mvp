'use client';

import { useEffect } from 'react';

export default function OldCalendarRedirect() {
  useEffect(() => {
    window.location.href = '/calendars';
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2" />
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}
