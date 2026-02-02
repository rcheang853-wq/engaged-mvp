'use client';

// Performance monitoring utilities for Core Web Vitals

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface PerformanceObserver {
  observe: (options: { entryTypes: string[] }) => void;
  disconnect: () => void;
}

// Web Vitals thresholds
const THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 },
  FID: { good: 100, poor: 300 },
  CLS: { good: 0.1, poor: 0.25 },
  FCP: { good: 1800, poor: 3000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

type MetricName = keyof typeof THRESHOLDS;

function getRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name];
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Performance metrics collector
class PerformanceMetrics {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initObservers();
    }
  }

  private initObservers() {
    // Largest Contentful Paint (LCP)
    this.observePerformanceEntry('largest-contentful-paint', (entry: any) => {
      this.addMetric('LCP', entry.renderTime || entry.loadTime);
    });

    // First Input Delay (FID)
    this.observePerformanceEntry('first-input', (entry: any) => {
      this.addMetric('FID', entry.processingStart - entry.startTime);
    });

    // Cumulative Layout Shift (CLS)
    this.observePerformanceEntry('layout-shift', (entry: any) => {
      if (!entry.hadRecentInput) {
        this.addMetric('CLS', entry.value);
      }
    });

    // First Contentful Paint (FCP)
    this.observePerformanceEntry('paint', (entry: any) => {
      if (entry.name === 'first-contentful-paint') {
        this.addMetric('FCP', entry.startTime);
      }
    });

    // Time to First Byte (TTFB)
    this.observeNavigationTiming();
  }

  private observePerformanceEntry(type: string, callback: (entry: any) => void) {
    try {
      const observer = new (window as any).PerformanceObserver((list: any) => {
        list.getEntries().forEach(callback);
      });
      observer.observe({ entryTypes: [type] });
      this.observers.push(observer);
    } catch (error) {
      console.warn(`Performance observer for ${type} not supported:`, error);
    }
  }

  private observeNavigationTiming() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const navigationEntry = performance.getEntriesByType('navigation')[0] as any;
      if (navigationEntry) {
        const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
        this.addMetric('TTFB', ttfb);
      }
    }
  }

  private addMetric(name: MetricName, value: number) {
    const metric: PerformanceMetric = {
      name,
      value,
      rating: getRating(name, value),
      timestamp: Date.now(),
    };

    this.metrics.push(metric);
    this.reportMetric(metric);
  }

  private reportMetric(metric: PerformanceMetric) {
    // Send to analytics service (Google Analytics, etc.)
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', metric.name, {
        event_category: 'Web Vitals',
        value: Math.round(metric.value),
        custom_map: { metric_rating: metric.rating },
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Performance] ${metric.name}: ${metric.value}ms (${metric.rating})`);
    }
  }

  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  public getMetric(name: MetricName): PerformanceMetric | undefined {
    return this.metrics.find(metric => metric.name === name);
  }

  public disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Initialize performance monitoring
let performanceMetrics: PerformanceMetrics | null = null;

export function initPerformanceMonitoring() {
  if (typeof window !== 'undefined' && !performanceMetrics) {
    performanceMetrics = new PerformanceMetrics();
  }
  return performanceMetrics;
}

export function getPerformanceMetrics() {
  return performanceMetrics?.getMetrics() || [];
}

export function getPerformanceMetric(name: MetricName) {
  return performanceMetrics?.getMetric(name);
}

// Custom hook for performance monitoring
export function usePerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    if (!performanceMetrics) {
      initPerformanceMonitoring();
    }
  }

  return {
    getMetrics: () => performanceMetrics?.getMetrics() || [],
    getMetric: (name: MetricName) => performanceMetrics?.getMetric(name),
  };
}

// Resource loading performance tracker
export function trackResourceTiming(resourceName: string) {
  if (typeof window === 'undefined') return;

  const observer = new (window as any).PerformanceObserver((list: any) => {
    list.getEntries().forEach((entry: any) => {
      if (entry.name.includes(resourceName)) {
        const duration = entry.responseEnd - entry.startTime;
        console.log(`[Performance] ${resourceName} loaded in ${duration}ms`);

        // Report long loading times
        if (duration > 1000) {
          console.warn(`[Performance] Slow resource loading: ${resourceName} took ${duration}ms`);
        }
      }
    });
  });

  observer.observe({ entryTypes: ['resource'] });

  // Clean up observer after 30 seconds
  setTimeout(() => observer.disconnect(), 30000);
}

// Bundle analysis helper
export function analyzeBundleSize() {
  if (typeof window === 'undefined') return;

  const resources = performance.getEntriesByType('resource') as any[];
  const jsResources = resources.filter(resource =>
    resource.name.includes('.js') && resource.name.includes('/_next/')
  );

  const totalSize = jsResources.reduce((total, resource) => {
    return total + (resource.transferSize || 0);
  }, 0);

  console.log(`[Performance] Total JS bundle size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

  if (totalSize > 1024 * 1024) { // > 1MB
    console.warn('[Performance] Large bundle size detected. Consider code splitting.');
  }

  return {
    totalSize,
    resources: jsResources.map(resource => ({
      name: resource.name,
      size: resource.transferSize,
      duration: resource.duration,
    })),
  };
}