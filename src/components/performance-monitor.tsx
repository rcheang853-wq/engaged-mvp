'use client';

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/performance';
import { registerServiceWorker } from '@/lib/service-worker';

export default function PerformanceMonitor() {
  useEffect(() => {
    // Initialize performance monitoring
    const performanceMetrics = initPerformanceMonitoring();
    registerServiceWorker();

    // Track page load completion
    const handleLoad = () => {
      if (typeof window !== 'undefined' && (window as any).performanceMarks) {
        const marks = (window as any).performanceMarks;
        marks.loadComplete = performance.now();

        console.log('[Performance] Page load metrics:', {
          navigationStart: marks.navigationStart,
          firstPaint: marks.firstPaint,
          firstContentfulPaint: marks.firstContentfulPaint,
          loadComplete: marks.loadComplete,
          totalLoadTime: marks.loadComplete - marks.navigationStart,
        });
      }
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
    }

    // Track visibility changes (for performance analytics)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden, good time to send analytics
        if (typeof window !== 'undefined' && (window as any).gtag) {
          (window as any).gtag('event', 'page_view_end', {
            event_category: 'Performance',
            value: Math.round(performance.now()),
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      performanceMetrics?.disconnect();
    };
  }, []);

  // This component doesn't render anything
  return null;
}
