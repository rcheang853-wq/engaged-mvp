'use client';

import { useEffect, useState, useCallback } from 'react';
import { trackPerformance } from '@/lib/analytics';

interface PerformanceMetrics {
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  fcp?: number; // First Contentful Paint
  ttfb?: number; // Time to First Byte
}

interface UsePerformanceResult {
  metrics: PerformanceMetrics;
  isLoading: boolean;
  measureCustomMetric: (name: string, startTime?: number) => number;
  startMeasurement: (name: string) => () => void;
}

export function usePerformance(): UsePerformanceResult {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isLoading, setIsLoading] = useState(true);
  const [measurements, setMeasurements] = useState<Map<string, number>>(new Map());

  // Measure custom performance metric
  const measureCustomMetric = useCallback((name: string, startTime?: number): number => {
    const endTime = performance.now();
    const duration = startTime ? endTime - startTime : endTime;

    trackPerformance(name, duration);
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

    return duration;
  }, []);

  // Start a measurement and return a function to end it
  const startMeasurement = useCallback((name: string) => {
    const startTime = performance.now();
    setMeasurements(prev => new Map(prev).set(name, startTime));

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      setMeasurements(prev => {
        const newMap = new Map(prev);
        newMap.delete(name);
        return newMap;
      });

      trackPerformance(name, duration);
      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);

      return duration;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const collectMetrics = () => {
      const newMetrics: PerformanceMetrics = {};

      // Get Navigation Timing for TTFB
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        newMetrics.ttfb = navigation.responseStart - navigation.requestStart;
      }

      setMetrics(newMetrics);
    };

    // Collect initial metrics
    collectMetrics();

    // Set up performance observers
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;

        setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
        trackPerformance('LCP', lastEntry.startTime);
      });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime;
          setMetrics(prev => ({ ...prev, fid }));
          trackPerformance('FID', fid);
        });
      });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        setMetrics(prev => ({ ...prev, cls: clsValue }));
      });

      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === 'first-contentful-paint') {
            setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
            trackPerformance('FCP', entry.startTime);
          }
        });
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        fidObserver.observe({ entryTypes: ['first-input'] });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        fcpObserver.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('Some performance observers not supported:', error);
      }

      // Send final CLS value when page is hidden
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          trackPerformance('CLS', clsValue);
          setIsLoading(false);
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Cleanup
      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
        fcpObserver.disconnect();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    } else {
      setIsLoading(false);
    }
  }, []);

  return {
    metrics,
    isLoading,
    measureCustomMetric,
    startMeasurement,
  };
}

// Hook for measuring component render performance
export function useRenderPerformance(componentName: string) {
  const { startMeasurement } = usePerformance();

  useEffect(() => {
    const endMeasurement = startMeasurement(`${componentName}_render`);
    return endMeasurement;
  }, [componentName, startMeasurement]);
}

// Hook for measuring API call performance
export function useApiPerformance() {
  const { measureCustomMetric } = usePerformance();

  const measureApiCall = useCallback(async <T>(
    apiCall: () => Promise<T>,
    apiName: string
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      measureCustomMetric(`api_${apiName}_success`, startTime);
      return result;
    } catch (error) {
      measureCustomMetric(`api_${apiName}_error`, startTime);
      throw error;
    }
  }, [measureCustomMetric]);

  return { measureApiCall };
}

// Performance budget constants
export const PERFORMANCE_BUDGETS = {
  LCP: 2500, // ms - Good
  FID: 100,  // ms - Good
  CLS: 0.1,  // Good
  FCP: 1800, // ms - Good
  TTFB: 800, // ms - Good
} as const;

// Check if metric meets performance budget
export function isMetricGood(metric: keyof PerformanceMetrics, value: number): boolean {
  switch (metric) {
    case 'lcp':
      return value <= PERFORMANCE_BUDGETS.LCP;
    case 'fid':
      return value <= PERFORMANCE_BUDGETS.FID;
    case 'cls':
      return value <= PERFORMANCE_BUDGETS.CLS;
    case 'fcp':
      return value <= PERFORMANCE_BUDGETS.FCP;
    case 'ttfb':
      return value <= PERFORMANCE_BUDGETS.TTFB;
    default:
      return true;
  }
}