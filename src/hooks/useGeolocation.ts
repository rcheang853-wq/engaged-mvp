'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
  permission: PermissionState | null;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

const DEFAULT_OPTIONS: GeolocationOptions = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 300000, // 5 minutes
  watch: false,
};

/**
 * Custom hook for handling geolocation with privacy-first approach
 */
export function useGeolocation(options: GeolocationOptions = {}) {
  const { enableHighAccuracy, timeout, maximumAge, watch } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    permission: null,
  });

  const [watchId, setWatchId] = useState<number | null>(null);

  // Check geolocation permission status
  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) {
      return null;
    }

    try {
      const permission = await navigator.permissions.query({ name: 'geolocation' });
      setState(prev => ({ ...prev, permission: permission.state }));
      return permission.state;
    } catch (error) {
      console.warn('Failed to check geolocation permission:', error);
      return null;
    }
  }, []);

  // Get current position
  const getCurrentPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        }));
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        ...(enableHighAccuracy !== undefined && { enableHighAccuracy }),
        ...(timeout !== undefined && { timeout }),
        ...(maximumAge !== undefined && { maximumAge }),
      }
    );
  }, [enableHighAccuracy, timeout, maximumAge]);

  // Start watching position
  const startWatching = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: 'Geolocation is not supported by this browser',
      }));
      return;
    }

    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setState(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          loading: false,
          error: null,
        }));
      },
      (error) => {
        let errorMessage = 'Unable to retrieve location';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out';
            break;
        }

        setState(prev => ({
          ...prev,
          error: errorMessage,
          loading: false,
        }));
      },
      {
        ...(enableHighAccuracy !== undefined && { enableHighAccuracy }),
        ...(timeout !== undefined && { timeout }),
        ...(maximumAge !== undefined && { maximumAge }),
      }
    );

    setWatchId(id);
  }, [enableHighAccuracy, timeout, maximumAge, watchId]);

  // Stop watching position
  const stopWatching = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
  }, [watchId]);

  // Clear location data
  const clearLocation = useCallback(() => {
    setState({
      latitude: null,
      longitude: null,
      accuracy: null,
      error: null,
      loading: false,
      permission: state.permission,
    });
  }, [state.permission]);

  // Initialize on mount
  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  // Auto-start location fetching if watch is enabled
  useEffect(() => {
    if (watch) {
      startWatching();
    } else {
      getCurrentPosition();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watch, getCurrentPosition, startWatching, watchId]);

  return {
    ...state,
    getCurrentPosition,
    startWatching,
    stopWatching,
    clearLocation,
    checkPermission,
    isLocationAvailable: state.latitude !== null && state.longitude !== null,
    hasError: state.error !== null,
  };
}

/**
 * Get user's approximate location based on IP (fallback)
 * This is a privacy-friendly fallback that provides city-level accuracy
 */
export async function getApproximateLocation(): Promise<{
  latitude: number;
  longitude: number;
  city: string;
  country: string;
} | null> {
  try {
    // Using a free IP geolocation service
    const response = await fetch('https://ipapi.co/json/', {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get location from IP');
    }

    const data = await response.json();

    return {
      latitude: data.latitude,
      longitude: data.longitude,
      city: data.city,
      country: data.country_name,
    };
  } catch (error) {
    console.warn('Failed to get approximate location:', error);
    return null;
  }
}

/**
 * Default location fallback (Macau)
 */
export const DEFAULT_LOCATION = {
  latitude: 22.1987,
  longitude: 113.5439,
  city: 'Macau',
  country: 'China',
};

/**
 * Check if coordinates are within a reasonable range for Macau/HK/GBA
 */
export function isValidGBALocation(latitude: number, longitude: number): boolean {
  // Rough bounds for Greater Bay Area
  const bounds = {
    north: 24.5,
    south: 21.5,
    east: 115.5,
    west: 111.5,
  };

  return (
    latitude >= bounds.south &&
    latitude <= bounds.north &&
    longitude >= bounds.west &&
    longitude <= bounds.east
  );
}