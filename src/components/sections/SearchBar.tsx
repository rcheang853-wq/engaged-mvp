'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, X, Filter, Calendar, MapPin, Tag } from 'lucide-react';
import { searchEvents } from '@/lib/queries/events';
import { Event, EventFilters } from '@/types';
import { EventCard } from '@/components/events/EventCard';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchBarProps {
  onResults?: (events: Event[], query: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

export function SearchBar({
  onResults,
  placeholder = 'Search events, venues, or organizers...',
  autoFocus = false,
  className = ''
}: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<EventFilters>({});
  const [results, setResults] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim() || Object.keys(filters).some(key => filters[key as keyof EventFilters])) {
      performSearch();
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery, filters]);

  const performSearch = useCallback(async () => {
    if (!debouncedQuery.trim() && !Object.keys(filters).some(key => filters[key as keyof EventFilters])) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const searchParams = {
        limit: 20,
        ...(filters.categories && { categories: filters.categories }),
        ...(filters.dateRange && { dateRange: filters.dateRange }),
        ...(filters.location && { location: filters.location }),
      };

      const searchResults = await searchEvents(debouncedQuery, searchParams);

      setResults(searchResults.events);
      setShowResults(true);
      onResults?.(searchResults.events, debouncedQuery);
    } catch (err) {
      console.error('Search failed:', err);
      setError('Search failed. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, filters, onResults]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (value.trim()) {
      setShowResults(true);
    }
  };

  const handleInputFocus = () => {
    if (query.trim() || results.length > 0) {
      setShowResults(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding results to allow for clicks on results
    setTimeout(() => {
      setShowResults(false);
    }, 200);
  };

  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
    setFilters({});
  };

  const handleFilterChange = (newFilters: EventFilters) => {
    setFilters(newFilters);
  };

  const hasActiveFilters = Object.keys(filters).some(key => filters[key as keyof EventFilters]);

  return (
    <div className={`relative w-full max-w-2xl mx-auto ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-12 pr-20 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
        />

        <div className="absolute inset-y-0 right-0 flex items-center pr-4 space-x-2">
          {/* Filter button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              hasActiveFilters || showFilters
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-600'
            }`}
            aria-label="Search filters"
          >
            <Filter className="h-4 w-4" />
          </button>

          {/* Clear button */}
          {(query || hasActiveFilters) && (
            <button
              onClick={clearSearch}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {/* Loading indicator */}
          {loading && (
            <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Search Filters */}
      {showFilters && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-4">
          <SearchFilters
            filters={filters}
            onChange={handleFilterChange}
            onClose={() => setShowFilters(false)}
          />
        </div>
      )}

      {/* Search Results */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-40 max-h-96 overflow-y-auto">
          {error && (
            <div className="p-4 text-red-600 text-center">
              {error}
            </div>
          )}

          {!loading && !error && results.length === 0 && query.trim() && (
            <div className="p-8 text-center text-gray-500">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p>No events found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords or adjust your filters</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">
                  {results.length} event{results.length !== 1 ? 's' : ''} found
                </h3>
                {query.trim() && (
                  <span className="text-sm text-gray-500">for "{query}"</span>
                )}
              </div>

              <div className="space-y-4">
                {results.slice(0, 6).map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="compact"
                    className="hover:bg-gray-50"
                  />
                ))}
              </div>

              {results.length > 6 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => window.location.href = `/search?q=${encodeURIComponent(query)}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View all {results.length} results
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SearchFiltersProps {
  filters: EventFilters;
  onChange: (filters: EventFilters) => void;
  onClose: () => void;
}

function SearchFilters({ filters, onChange, onClose }: SearchFiltersProps) {
  const [localFilters, setLocalFilters] = useState<EventFilters>(filters);

  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : undefined;
    const currentRange = localFilters.dateRange || { start: new Date(), end: new Date() };

    setLocalFilters({
      ...localFilters,
      dateRange: {
        ...currentRange,
        [type]: date || (type === 'start' ? new Date() : new Date()),
      },
    });
  };

  const handleApplyFilters = () => {
    onChange(localFilters);
    onClose();
  };

  const handleClearFilters = () => {
    setLocalFilters({});
    onChange({});
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Search Filters</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Date Range */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          Date Range
        </label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={localFilters.dateRange?.start?.toISOString().split('T')[0] || ''}
            onChange={(e) => handleDateRangeChange('start', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="Start date"
          />
          <input
            type="date"
            value={localFilters.dateRange?.end?.toISOString().split('T')[0] || ''}
            onChange={(e) => handleDateRangeChange('end', e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            placeholder="End date"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="w-4 h-4 inline mr-1" />
          Location
        </label>
        <input
          type="text"
          value={localFilters.location || ''}
          onChange={(e) => setLocalFilters({ ...localFilters, location: e.target.value || undefined })}
          placeholder="City or venue name"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {/* Categories */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Tag className="w-4 h-4 inline mr-1" />
          Categories
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['music', 'art', 'food', 'sports', 'tech', 'business'].map((category) => (
            <label key={category} className="flex items-center">
              <input
                type="checkbox"
                checked={localFilters.categories?.includes(category) || false}
                onChange={(e) => {
                  const currentCategories = localFilters.categories || [];
                  const newCategories = e.target.checked
                    ? [...currentCategories, category]
                    : currentCategories.filter(c => c !== category);

                  setLocalFilters({
                    ...localFilters,
                    categories: newCategories.length > 0 ? newCategories : undefined,
                  });
                }}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 capitalize">{category}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between pt-4 border-t">
        <button
          onClick={handleClearFilters}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
        >
          Clear all
        </button>
        <button
          onClick={handleApplyFilters}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          Apply filters
        </button>
      </div>
    </div>
  );
}