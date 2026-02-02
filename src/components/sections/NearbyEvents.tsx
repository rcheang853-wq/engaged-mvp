'use client';

import { useState, useEffect } from 'react';
import { MapPin, Navigation, Settings, ChevronRight, Loader2 } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { getNearbyEvents, calculateDistance } from '@/lib/queries/events';
import { useGeolocation, getApproximateLocation, DEFAULT_LOCATION } from '@/hooks/useGeolocation';
import { Event } from '@/types';
import Link from 'next/link';

interface NearbyEventsProps {
  limit?: number;
  showHeader?: boolean;
  initialEvents?: Event[];
  defaultRadius?: number;
}

interface EventWithDistance extends Event {
  distance?: number;
}

export function NearbyEvents({
  limit = 8,
  showHeader = true,
  initialEvents = [],
  defaultRadius = 50
}: NearbyEventsProps) {
  const [events, setEvents] = useState<EventWithDistance[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [radius, setRadius] = useState(defaultRadius);
  const [showRadiusSettings, setShowRadiusSettings] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);

  const {
    latitude,
    longitude,
    error: locationError,
    loading: locationLoading,
    getCurrentPosition,
    permission,
  } = useGeolocation({
    enableHighAccuracy: false,
    timeout: 10000,
    maximumAge: 300000, // 5 minutes
  });

  // Set user location when geolocation is available
  useEffect(() => {
    if (latitude && longitude) {
      setUserLocation({ latitude, longitude });
    }
  }, [latitude, longitude]);

  // Load events when location or radius changes
  useEffect(() => {
    if (userLocation) {
      loadNearbyEvents();
    } else if (!locationLoading && (locationError || permission === 'denied')) {
      // Try to get approximate location or use default
      loadApproximateLocation();
    }
  }, [userLocation, radius, locationLoading, locationError, permission]);

  const loadApproximateLocation = async () => {
    try {
      const approxLocation = await getApproximateLocation();
      if (approxLocation) {
        setUserLocation({
          latitude: approxLocation.latitude,
          longitude: approxLocation.longitude
        });
      } else {
        // Use default Macau location
        setUserLocation(DEFAULT_LOCATION);
      }
    } catch (err) {
      console.warn('Failed to get approximate location, using default:', err);
      setUserLocation(DEFAULT_LOCATION);
    }
  };

  const loadNearbyEvents = async () => {
    if (!userLocation) return;

    try {
      setLoading(true);
      setError(null);

      const nearbyEvents = await getNearbyEvents({
        limit,
        userLocation,
        radius
      });

      // Calculate distances for events that have venue coordinates
      const eventsWithDistance = nearbyEvents.map(event => {
        if (event.venue?.latitude && event.venue?.longitude) {
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            event.venue.latitude,
            event.venue.longitude
          );
          return { ...event, distance };
        }
        return event;
      });

      // Sort by distance if available
      eventsWithDistance.sort((a, b) => {
        const aDistance = (a as EventWithDistance).distance;
        const bDistance = (b as EventWithDistance).distance;

        if (aDistance && bDistance) {
          return aDistance - bDistance;
        }
        if (aDistance && !bDistance) return -1;
        if (!aDistance && bDistance) return 1;
        return 0;
      });

      setEvents(eventsWithDistance);
    } catch (err) {
      console.error('Failed to load nearby events:', err);
      setError('Failed to load nearby events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocationRequest = () => {
    if (permission === 'denied') {
      setError('Location access was denied. Please enable location permissions in your browser settings to see nearby events.');
      return;
    }
    getCurrentPosition();
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    setShowRadiusSettings(false);
  };

  const getLocationStatus = () => {
    if (locationLoading) return 'Getting your location...';
    if (locationError && !userLocation) return 'Unable to get location';
    if (userLocation === DEFAULT_LOCATION) return 'Showing events near Macau';
    if (userLocation) return `Showing events within ${radius}km`;
    return 'Location required';
  };

  if (loading && !events.length) {
    return (
      <section className="w-full">
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <MapPin className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-900">Nearby Events</h2>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 animate-pulse rounded-xl aspect-[3/4]"
              role="status"
              aria-label="Loading nearby event"
            />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <MapPin className="w-6 h-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900">Nearby Events</h2>
          </div>

          <div className="flex items-center space-x-3">
            {/* Location status and settings */}
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setShowRadiusSettings(!showRadiusSettings)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>{radius}km radius</span>
                </button>

                {showRadiusSettings && (
                  <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-32">
                    {[10, 25, 50, 100].map((r) => (
                      <button
                        key={r}
                        onClick={() => handleRadiusChange(r)}
                        className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                          radius === r ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {r}km
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!userLocation && !locationLoading && (
                <button
                  onClick={handleLocationRequest}
                  className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Use my location</span>
                </button>
              )}

              {locationLoading && (
                <div className="flex items-center space-x-1 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Locating...</span>
                </div>
              )}
            </div>

            <Link
              href={`/search?nearby=true&radius=${radius}`}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors group"
            >
              View all
              <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      )}

      {/* Location status */}
      <div className="mb-4 text-sm text-gray-600">
        {getLocationStatus()}
      </div>

      {error && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">{error}</p>
          {permission === 'denied' && (
            <button
              onClick={loadApproximateLocation}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Use approximate location instead
            </button>
          )}
        </div>
      )}

      {loading && events.length > 0 && (
        <div className="mb-4 flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-blue-500 mr-2" />
          <span className="text-sm text-gray-600">Updating nearby events...</span>
        </div>
      )}

      {events.length === 0 && !loading ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No events found nearby</h3>
          <p className="text-gray-600 mb-4">
            Try increasing your search radius or check back later for new events.
          </p>
          <button
            onClick={() => handleRadiusChange(radius * 2)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Expand search to {radius * 2}km
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              variant="default"
              showDistance={!!(event as EventWithDistance).distance}
              distance={(event as EventWithDistance).distance}
              className="h-full"
            />
          ))}
        </div>
      )}

      {userLocation && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Events are sorted by distance from your location
          </p>
        </div>
      )}
    </section>
  );
}