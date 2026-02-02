'use client';

// Service Worker registration and management
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // In development, make sure any previously registered workers are removed
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .catch((error) => console.warn('Failed to unregister service workers in development:', error));

    if ('caches' in window) {
      caches
        .keys()
        .then((cacheNames) => Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName))))
        .catch((error) => console.warn('Failed to clear caches in development:', error));
    }

    return;
  }

  const globalScope = window as typeof window & { __engagedSwRegistered?: boolean };
  if (globalScope.__engagedSwRegistered) {
    return;
  }
  globalScope.__engagedSwRegistered = true;

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) {
            return;
          }

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('New service worker available - refresh to update.');

              if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('App Update Available', {
                  body: 'A new version of the app is available. Refresh to update.',
                  icon: '/icon-192x192.png',
                });
              }
            }
          });
        });

        console.log('Service worker registered successfully.');
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });
}

// Request permission for notifications
export async function requestNotificationPermission() {
  if ('Notification' in window && navigator.serviceWorker) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

// Check if the app is running in offline mode
export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

// Listen for online/offline status changes
export function setupNetworkStatusListener(
  onOnline?: () => void,
  onOffline?: () => void
) {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('App is online');
      onOnline?.();
    });

    window.addEventListener('offline', () => {
      console.log('App is offline');
      onOffline?.();
    });
  }
}

// Clear all caches (useful for development)
export async function clearAllCaches() {
  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  }
}

// Check cache usage
export async function getCacheUsage() {
  if ('caches' in window && 'storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      const cacheNames = await caches.keys();

      return {
        quota: estimate.quota,
        usage: estimate.usage,
        cacheCount: cacheNames.length,
        caches: cacheNames,
      };
    } catch (error) {
      console.error('Error getting cache usage:', error);
      return null;
    }
  }
  return null;
}

// Prefetch critical resources
export function prefetchCriticalResources(urls: string[]) {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'PREFETCH_RESOURCES',
      urls,
    });
  }
}
