'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Event card skeleton for loading state
export function EventCardSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-lg border shadow-sm">
      <div className="h-48 bg-gray-200 rounded-t-lg"></div>
      <div className="p-4 space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        <div className="flex space-x-2">
          <div className="h-2 bg-gray-200 rounded w-16"></div>
          <div className="h-2 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}

// Event list skeleton
export function EventListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

// Dynamically import the event list component
const EventListComponent = dynamic(
  () => import('../event-list').then(mod => ({ default: mod.EventList })),
  {
    loading: () => <EventListSkeleton />,
    ssr: true, // Events can be server-side rendered for SEO
  }
);

// Dynamically import event card component for individual cards
const EventCardComponent = dynamic(
  () => import('../event-card').then(mod => ({ default: mod.EventCard })),
  {
    loading: () => <EventCardSkeleton />,
    ssr: true,
  }
);

export function LazyEventList(props: React.ComponentProps<typeof EventListComponent>) {
  return (
    <Suspense fallback={<EventListSkeleton />}>
      <EventListComponent {...props} />
    </Suspense>
  );
}

export function LazyEventCard(props: React.ComponentProps<typeof EventCardComponent>) {
  return (
    <Suspense fallback={<EventCardSkeleton />}>
      <EventCardComponent {...props} />
    </Suspense>
  );
}