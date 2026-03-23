'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Clock, ChevronLeft, X } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

interface SearchResult {
  id: string;
  calendar_id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  color: string | null;
  calendars: {
    id: string;
    name: string;
    color: string;
  };
}

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/search/events?q=${encodeURIComponent(searchQuery.trim())}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const formatEventDate = (startAt: string, endAt: string | null, allDay: boolean) => {
    const start = new Date(startAt);
    const end = endAt ? new Date(endAt) : null;

    if (allDay) {
      return start.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const dateStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const timeStr = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    if (end) {
      const endTimeStr = end.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return `${dateStr} • ${timeStr} - ${endTimeStr}`;
    }

    return `${dateStr} • ${timeStr}`;
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      <div className="sticky top-0 z-10 bg-[#F9FAFB] px-4 pt-12 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F9FAFB] transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-[#111827]">Search</h1>
            <p className="text-xs text-[#6B7280]">Find events across your calendars</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <form onSubmit={handleSearch} className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, description, location..."
            className="w-full pl-9 pr-9 py-3 bg-white border border-[#E5E7EB] rounded-full text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] transition-colors"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
                router.push('/search');
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full hover:bg-[#F3F4F6] flex items-center justify-center transition-colors"
              aria-label="Clear search"
            >
              <X size={14} className="text-[#6B7280]" />
            </button>
          )}
        </form>
      </div>

      <div className="px-4 pb-6 max-w-2xl mx-auto">
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 h-32 animate-pulse" />
            ))}
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <p className="text-[#EF4444] text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && hasSearched && results.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[#F3F4F6] rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-[#9CA3AF]" />
            </div>
            <h2 className="text-base font-semibold text-[#111827] mb-1">No events found</h2>
            <p className="text-[#6B7280] text-sm">Try searching with different keywords</p>
          </div>
        )}

        {!loading && !error && !hasSearched && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Search size={32} className="text-[#3B82F6]" />
            </div>
            <h2 className="text-base font-semibold text-[#111827] mb-1">Search for events</h2>
            <p className="text-[#6B7280] text-sm">Search across all calendars you belong to</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-[#6B7280] px-1">
              {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{searchParams.get('q')}&quot;
            </p>
            {results.map((event) => (
              <Link
                key={event.id}
                href={`/calendars/${event.calendar_id}/events/${event.id}`}
                className="block"
              >
                <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: event.calendars.color }} />
                    <span className="text-xs font-medium text-[#6B7280]">{event.calendars.name}</span>
                  </div>

                  <h3 className="font-semibold text-[#111827] mb-2 line-clamp-2">{event.title}</h3>

                  <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-1">
                    <Clock size={14} className="flex-shrink-0" />
                    <span className="line-clamp-1">{formatEventDate(event.start_at, event.end_at, event.all_day)}</span>
                  </div>

                  {event.location && (
                    <div className="flex items-center gap-2 text-sm text-[#6B7280] mb-2">
                      <MapPin size={14} className="flex-shrink-0" />
                      <span className="line-clamp-1">{event.location}</span>
                    </div>
                  )}

                  {event.description && (
                    <p className="text-sm text-[#6B7280] line-clamp-2">{event.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
