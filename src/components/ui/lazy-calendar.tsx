'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Calendar skeleton component for loading state
export function CalendarSkeleton() {
  return (
    <div className="animate-pulse bg-gray-50 rounded-lg border">
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="flex space-x-2">
            <div className="h-8 bg-gray-200 rounded w-16"></div>
            <div className="h-8 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-2 mb-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-200 rounded"></div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded border"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Dynamically import the calendar component to reduce initial bundle size
const CalendarComponent = dynamic(
  () => import('./calendar-view').then(mod => ({ default: mod.CalendarView })),
  {
    loading: () => <CalendarSkeleton />,
    ssr: false, // Calendar is interactive, no need for SSR
  }
);

export function LazyCalendar(props: React.ComponentProps<typeof CalendarComponent>) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <CalendarComponent {...props} />
    </Suspense>
  );
}