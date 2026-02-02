'use client';

import { Suspense } from 'react';
import { NearbyEvents } from './NearbyEvents';
import { Event } from '@/types';

interface NearbyEventsWrapperProps {
  limit?: number;
  showHeader?: boolean;
  initialEvents?: Event[];
  defaultRadius?: number;
}

export function NearbyEventsWrapper(props: NearbyEventsWrapperProps) {
  return (
    <Suspense fallback={<NearbyEventsSkeleton />}>
      <NearbyEvents {...props} />
    </Suspense>
  );
}

function NearbyEventsSkeleton() {
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-gray-200 rounded animate-pulse" />
          <div className="w-40 h-8 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="bg-gray-200 animate-pulse rounded-xl aspect-[3/4]"
          />
        ))}
      </div>
    </section>
  );
}