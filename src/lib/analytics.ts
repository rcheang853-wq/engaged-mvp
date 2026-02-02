'use client';

// Analytics and error tracking integration

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Google Analytics Configuration
export const GA_TRACKING_ID = process.env.NEXT_PUBLIC_GA_ID || '';

// Initialize Google Analytics
export function initAnalytics() {
  if (typeof window === 'undefined' || !GA_TRACKING_ID) return;

  // Load gtag script
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`;
  script.async = true;
  document.head.appendChild(script);

  // Initialize dataLayer and gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };

  window.gtag('js', new Date());
  window.gtag('config', GA_TRACKING_ID, {
    page_title: document.title,
    page_location: window.location.href,
    send_page_view: true,
  });
}

// Track page views
export function trackPageView(url: string, title?: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('config', GA_TRACKING_ID, {
    page_title: title || document.title,
    page_location: url,
    send_page_view: true,
  });
}

// Track custom events
export function trackEvent(action: string, category: string, label?: string, value?: number) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', action, {
    event_category: category,
    event_label: label,
    value: value,
  });
}

// Track user engagement
export function trackEngagement(action: string, details?: Record<string, any>) {
  trackEvent(action, 'User Engagement', JSON.stringify(details));
}

// Track performance metrics
export function trackPerformance(metric: string, value: number, details?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'performance_metric', {
    event_category: 'Performance',
    metric_name: metric,
    metric_value: value,
    custom_parameters: details,
  });
}

// Track errors
export function trackError(error: Error, context?: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'exception', {
    description: error.message,
    fatal: false,
    error_context: context,
    error_stack: error.stack,
  });

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Tracked error:', error, 'Context:', context);
  }
}

// Track conversions
export function trackConversion(action: string, value?: number, currency = 'USD') {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'conversion', {
    event_category: 'Conversion',
    event_label: action,
    value: value,
    currency: currency,
  });
}

// Track user properties
export function setUserProperties(properties: Record<string, any>) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('config', GA_TRACKING_ID, {
    custom_map: properties,
  });
}

// Enhanced ecommerce tracking for events
export function trackEventView(eventId: string, eventName: string, category: string, price?: number) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'view_item', {
    event_category: 'Events',
    currency: 'MOP',
    value: price || 0,
    items: [{
      item_id: eventId,
      item_name: eventName,
      item_category: category,
      price: price || 0,
      quantity: 1,
    }],
  });
}

export function trackEventSave(eventId: string, eventName: string, category: string) {
  trackEvent('save_event', 'Events', eventName);

  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'add_to_wishlist', {
    event_category: 'Events',
    currency: 'MOP',
    items: [{
      item_id: eventId,
      item_name: eventName,
      item_category: category,
    }],
  });
}

// Performance monitoring integration
export function setupPerformanceMonitoring() {
  if (typeof window === 'undefined') return;

  // Track Core Web Vitals
  if ('PerformanceObserver' in window) {
    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackPerformance('LCP', entry.startTime, {
          element: entry.element?.tagName,
          url: entry.url,
        });
      }
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const fid = entry.processingStart - entry.startTime;
        trackPerformance('FID', fid, {
          event_type: entry.name,
        });
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Send CLS when page is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        trackPerformance('CLS', clsValue);
      }
    });
  }

  // Track JavaScript errors
  window.addEventListener('error', (event) => {
    trackError(new Error(event.message), `${event.filename}:${event.lineno}`);
  });

  // Track unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    trackError(new Error(event.reason), 'Unhandled Promise Rejection');
  });
}

// A/B Testing support
export function trackExperiment(experimentId: string, variant: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  window.gtag('event', 'experiment_impression', {
    experiment_id: experimentId,
    variant_id: variant,
  });
}

// User journey tracking
export function trackUserJourney(step: string, funnel: string, additionalData?: Record<string, any>) {
  trackEvent(step, 'User Journey', funnel);

  if (additionalData && typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'funnel_step', {
      funnel_name: funnel,
      step_name: step,
      ...additionalData,
    });
  }
}

// Custom hook for analytics
export function useAnalytics() {
  return {
    trackPageView,
    trackEvent,
    trackEngagement,
    trackPerformance,
    trackError,
    trackConversion,
    trackEventView,
    trackEventSave,
    trackExperiment,
    trackUserJourney,
    setUserProperties,
  };
}