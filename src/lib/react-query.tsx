'use client';

import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, ReactNode } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import devtools only in development
const ReactQueryDevtoolsProduction = dynamic(
  () =>
    import('@tanstack/react-query-devtools/build/modern/production.js').then(
      (d) => ({
        default: d.ReactQueryDevtools,
      }),
    ),
  { ssr: false }
);

// Performance-optimized query defaults
const queryDefaults = {
  queries: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount: number, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: 'always',
  },
  mutations: {
    retry: 1,
  },
} as const;

// Error handling for queries and mutations
const queryCache = new QueryCache({
  onError: (error: any, query) => {
    // Log errors for monitoring
    console.error('Query error:', error, 'Query key:', query.queryKey);

    // Track errors in production
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      // Send to error tracking service (Sentry, etc.)
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: `Query error: ${error.message}`,
          fatal: false,
        });
      }
    }
  },
});

const mutationCache = new MutationCache({
  onError: (error: any, variables, context, mutation) => {
    console.error('Mutation error:', error, 'Variables:', variables);

    // Track mutation errors
    if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
      if ((window as any).gtag) {
        (window as any).gtag('event', 'exception', {
          description: `Mutation error: ${error.message}`,
          fatal: false,
        });
      }
    }
  },
});

export default function ReactQueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        queryCache,
        mutationCache,
        defaultOptions: queryDefaults,
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
      {process.env.NODE_ENV === 'production' && (
        <ReactQueryDevtoolsProduction initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}

// Custom hook for prefetching queries with performance optimization
export function usePrefetchQuery() {
  const queryClient = new QueryClient({
    defaultOptions: queryDefaults,
  });

  return {
    prefetchQuery: queryClient.prefetchQuery.bind(queryClient),
    prefetchInfiniteQuery: queryClient.prefetchInfiniteQuery.bind(queryClient),
  };
}

// Performance monitoring for queries
export function trackQueryPerformance(queryKey: string, startTime: number) {
  const duration = performance.now() - startTime;

  if (duration > 1000) { // Queries taking longer than 1 second
    console.warn(`[Performance] Slow query: ${queryKey} took ${duration}ms`);
  }

  // Track in analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', 'timing_complete', {
      name: 'query_duration',
      value: Math.round(duration),
      event_category: 'Performance',
      custom_map: { query_key: queryKey },
    });
  }
}