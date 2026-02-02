'use client';

import { useState, useEffect } from 'react';
import { Crown, Star, Trophy } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { getTopEvents } from '@/lib/queries/events';
import { Event } from '@/types';

interface TopEventsProps {
  limit?: number;
  showHeader?: boolean;
  initialEvents?: Event[];
}

export function TopEvents({
  limit = 10,
  showHeader = true,
  initialEvents = []
}: TopEventsProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(!initialEvents.length);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEvents.length === 0) {
      loadTopEvents();
    }
  }, [initialEvents.length]);

  const loadTopEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const topEvents = await getTopEvents({ limit });
      setEvents(topEvents);
    } catch (err) {
      console.error('Failed to load top events:', err);
      setError('Failed to load top events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getRankingBadge = (index: number) => {
    if (index === 0) {
      return (
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center shadow-lg">
          <Crown className="w-4 h-4 text-white" />
        </div>
      );
    }
    if (index === 1) {
      return (
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full flex items-center justify-center shadow-lg">
          <Trophy className="w-4 h-4 text-white" />
        </div>
      );
    }
    if (index === 2) {
      return (
        <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-amber-600 to-amber-800 rounded-full flex items-center justify-center shadow-lg">
          <Trophy className="w-4 h-4 text-white" />
        </div>
      );
    }
    return (
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
        <span className="text-white text-sm font-bold">{index + 1}</span>
      </div>
    );
  };

  if (loading) {
    return (
      <section className="w-full">
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900">Top 10 Events</h2>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 animate-pulse rounded-xl aspect-[3/4]"
              role="status"
              aria-label="Loading top event"
            />
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="w-full">
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900">Top 10 Events</h2>
            </div>
          </div>
        )}

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTopEvents}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  if (events.length === 0) {
    return (
      <section className="w-full">
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <Star className="w-6 h-6 text-yellow-500" />
              <h2 className="text-2xl font-bold text-gray-900">Top 10 Events</h2>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No featured events available</h3>
          <p className="text-gray-600">Check back later for our curated selection of top events.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Star className="w-6 h-6 text-yellow-500" />
            <h2 className="text-2xl font-bold text-gray-900">
              Top 10 Events
            </h2>
            <span className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full flex items-center">
              <Crown className="w-3 h-3 mr-1" />
              Curated
            </span>
          </div>

        </div>
      )}

      {/* Featured intro text */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <Star className="w-4 h-4 inline text-yellow-500 mr-1" />
          Hand-picked by our editorial team based on quality, uniqueness, and community impact.
        </p>
      </div>

      {/* Top 3 events in a special layout */}
      {events.length >= 3 && events[0] && events[1] && events[2] && (
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Winner (center on mobile, left on desktop) */}
            <div className="md:order-2 relative">
              {getRankingBadge(0)}
              <EventCard
                event={events[0]}
                variant="featured"
                className="h-full"
              />
            </div>

            {/* Second place */}
            <div className="md:order-1 relative">
              {getRankingBadge(1)}
              <EventCard
                event={events[1]}
                variant="default"
                className="h-full"
              />
            </div>

            {/* Third place */}
            <div className="md:order-3 relative">
              {getRankingBadge(2)}
              <EventCard
                event={events[2]}
                variant="default"
                className="h-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Remaining events in a grid */}
      {events.length > 3 && (
        <>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">More Featured Events</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {events.slice(3).map((event, index) => (
              <div key={event.id} className="relative">
                {getRankingBadge(index + 3)}
                <EventCard
                  event={event}
                  variant="default"
                  className="h-full"
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* If less than 3 events, show them in a regular grid */}
      {events.length > 0 && events.length < 3 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <div key={event.id} className="relative">
              {getRankingBadge(index)}
              <EventCard
                event={event}
                variant={index === 0 ? 'featured' : 'default'}
                className="h-full"
              />
            </div>
          ))}
        </div>
      )}

      {/* Quality assurance note */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Rankings updated weekly based on quality score, community engagement, and editorial review
        </p>
      </div>
    </section>
  );
}
