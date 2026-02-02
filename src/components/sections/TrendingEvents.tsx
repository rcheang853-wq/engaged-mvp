'use client';

import { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';
import { EventCard } from '@/components/events/EventCard';
import { getTrendingEvents } from '@/lib/queries/events';
import { Event } from '@/types';

interface TrendingEventsProps {
  limit?: number;
  showHeader?: boolean;
  initialEvents?: Event[];
}

export function TrendingEvents({
  limit = 8,
  showHeader = true,
  initialEvents = []
}: TrendingEventsProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [loading, setLoading] = useState(!initialEvents.length);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialEvents.length === 0) {
      loadTrendingEvents();
    }
  }, [initialEvents.length]);

  const loadTrendingEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const trendingEvents = await getTrendingEvents({ limit });
      setEvents(trendingEvents);
    } catch (err) {
      console.error('Failed to load trending events:', err);
      setError('Failed to load trending events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section className="w-full">
        {showHeader && (
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900">Trending Events</h2>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: limit }).map((_, index) => (
            <div
              key={index}
              className="bg-gray-200 animate-pulse rounded-xl aspect-[3/4]"
              role="status"
              aria-label="Loading trending event"
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
              <TrendingUp className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900">Trending Events</h2>
            </div>
          </div>
        )}

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={loadTrendingEvents}
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
              <TrendingUp className="w-6 h-6 text-red-500" />
              <h2 className="text-2xl font-bold text-gray-900">Trending Events</h2>
            </div>
          </div>
        )}

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trending events right now</h3>
          <p className="text-gray-600">Check back later for the latest trending events in your area.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full">
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-red-500" />
            <h2 className="text-2xl font-bold text-gray-900">
              Trending Events
            </h2>
            <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded-full">
              Hot
            </span>
          </div>

        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {events.map((event, index) => (
          <EventCard
            key={event.id}
            event={event}
            variant={index === 0 ? 'featured' : 'default'}
            className="h-full"
          />
        ))}
      </div>

      {/* Refresh indicator for trending status */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          Trending status updated every hour based on user engagement
        </p>
      </div>
    </section>
  );
}
