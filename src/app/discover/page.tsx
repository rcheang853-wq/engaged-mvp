'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapPin, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import EventCard, { PublicEvent } from '@/components/discover/EventCard';
import BottomTabBar from '@/components/BottomTabBar';

const PAGE_SIZE = 20;

export default function DiscoverPage() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState('');

  const fetchEvents = useCallback(async (nextOffset = 0, replace = true) => {
    if (nextOffset === 0) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(
        `/api/discover?days=60&limit=${PAGE_SIZE}&offset=${nextOffset}`
      );
      const json = await res.json();
      if (json.success) {
        setEvents(prev => replace ? json.data : [...prev, ...json.data]);
        setTotal(json.meta.total);
        setOffset(nextOffset + json.data.length);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(0, true);
  }, [fetchEvents]);

  // client-side search filter
  const filtered = query.trim()
    ? events.filter(e =>
        e.title.toLowerCase().includes(query.toLowerCase()) ||
        (e.venue_name ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : events;

  const hasMore = total != null && offset < total;

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">

      {/* Sticky top bar */}
      <div className="sticky top-0 z-10 bg-[#F9FAFB] px-4 pt-12 pb-3 space-y-3">

        {/* Location row */}
        <div className="flex items-center gap-2 h-6">
          <MapPin size={16} className="text-[#374151] flex-shrink-0" />
          <span className="text-sm font-semibold text-[#111827]">Nearby</span>
          <ChevronDown size={16} className="text-[#6B7280]" />
        </div>

        {/* Search row */}
        <div className="flex items-center gap-2">
          {/* Search field */}
          <div className="flex-1 flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full h-11 px-3">
            <Search size={16} className="text-[#9CA3AF] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Find things to do"
              className="flex-1 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] bg-transparent outline-none min-w-0"
            />
          </div>

          {/* Filter button */}
          <button className="w-10 h-10 flex items-center justify-center bg-white border border-[#E5E7EB] rounded-full flex-shrink-0">
            <SlidersHorizontal size={16} className="text-[#6B7280]" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 space-y-3">

        {/* Section title */}
        <h2 className="text-base font-bold text-[#111827]">Popular near you</h2>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex items-center gap-3 h-[92px] animate-pulse"
              >
                <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🎭</span>
            <h3 className="text-base font-semibold text-[#111827] mb-1">
              {query ? 'No results found' : 'No events right now'}
            </h3>
            <p className="text-sm text-[#6B7280]">
              {query ? 'Try a different search term' : 'Check back soon — new events are added every 12 hours'}
            </p>
          </div>
        )}

        {/* Event cards */}
        {!loading && (
          <div className="space-y-3">
            {filtered.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {/* Load more */}
        {!loading && hasMore && !query && (
          <button
            onClick={() => fetchEvents(offset, false)}
            disabled={loadingMore}
            className="w-full py-3 text-sm font-semibold text-[#3B82F6] disabled:text-gray-400"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        )}

        {/* Total count */}
        {!loading && total != null && filtered.length > 0 && (
          <p className="text-center text-xs text-[#9CA3AF] pb-2">
            {query
              ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}`
              : `${total} event${total !== 1 ? 's' : ''} in Macau`}
          </p>
        )}
      </div>

      {/* Bottom tab bar */}
      <BottomTabBar />
    </div>
  );
}
