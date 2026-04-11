'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { MapPin, ChevronDown, Search, SlidersHorizontal } from 'lucide-react';
import EventCard, { PublicEvent } from '@/components/discover/EventCard';
import PrivateEventCard, { type PrivateEvent } from '@/components/discover/PrivateEventCard';
import BottomTabBar from '@/components/BottomTabBar';
import DiscoverFilterModal, {
  DEFAULT_DISCOVER_FILTERS,
  type DiscoverFilters,
  type HolidayLocale,
} from '@/components/discover/DiscoverFilterModal';
import { HONG_KONG_DISCOVER_CATEGORIES } from '@/lib/discover/hong-kong-lcsd';

const PAGE_SIZE = 20;

const DISCOVER_LOCATIONS: Array<{ value: string; label: string }> = [
  { value: 'Macau', label: 'Macau' },
  { value: 'Hong Kong', label: 'Hong Kong' },
  // NOTE: value must match public_events.city
  { value: 'China', label: 'Mainland China' },
];

function locationLabel(value: string) {
  return DISCOVER_LOCATIONS.find((l) => l.value === value)?.label ?? value;
}

function uniqSorted(arr: (string | null | undefined)[]) {
  return Array.from(new Set(arr.filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b));
}

function parseList(v: string | null) {
  if (!v) return [];
  return v
    .split(',')
    .map((s) => decodeURIComponent(s.trim()))
    .filter(Boolean);
}

function filtersFromSearchParams(sp: URLSearchParams): DiscoverFilters {
  const datePreset = (sp.get('date') as any) ?? DEFAULT_DISCOVER_FILTERS.datePreset;
  const sort = (sp.get('sort') as any) ?? DEFAULT_DISCOVER_FILTERS.sort;

  return {
    datePreset,
    chosenDate: sp.get('chosenDate') ?? undefined,
    neighborhoods: parseList(sp.get('neighborhoods')),
    categories: parseList(sp.get('categories')),
    freeOnly: sp.get('free') === '1',
    onlineOnly: sp.get('online') === '1',
    sort,

    showHolidays: sp.get('holidays') === '1',
    holidayLocale: (sp.get('holidayLocale') as HolidayLocale) ?? 'MO',
  };
}

function applyFiltersToUrl(sp: URLSearchParams, filters: DiscoverFilters) {
  const next = new URLSearchParams(sp);

  // date
  if (filters.datePreset && filters.datePreset !== 'any') next.set('date', filters.datePreset);
  else next.delete('date');

  if (filters.datePreset === 'choose' && filters.chosenDate) next.set('chosenDate', filters.chosenDate);
  else next.delete('chosenDate');

  // lists
  if (filters.neighborhoods.length) next.set('neighborhoods', filters.neighborhoods.map(encodeURIComponent).join(','));
  else next.delete('neighborhoods');

  if (filters.categories.length) next.set('categories', filters.categories.map(encodeURIComponent).join(','));
  else next.delete('categories');

  // toggles
  if (filters.freeOnly) next.set('free', '1');
  else next.delete('free');

  if (filters.onlineOnly) next.set('online', '1');
  else next.delete('online');

  // holidays overlay
  if (filters.showHolidays) next.set('holidays', '1');
  else next.delete('holidays');

  if (filters.holidayLocale) next.set('holidayLocale', filters.holidayLocale);
  else next.delete('holidayLocale');

  // sort
  if (filters.sort && filters.sort !== 'relevance') next.set('sort', filters.sort);
  else next.delete('sort');

  // whenever filters change, reset pagination
  next.delete('offset');

  return next;
}

type HolidayEvent = {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  timezone: string;
  categories: string[];
  is_free: boolean;
  currency: string;
  images: string[];
  created_at: string;
};

export default function DiscoverClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const mode = (searchParams.get('mode') === 'private' ? 'private' : 'public') as 'public' | 'private';
  const city = (searchParams.get('city') ?? 'Macau').trim() || 'Macau';

  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [privateEvents, setPrivateEvents] = useState<PrivateEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState<number | null>(null);

  const [holidayEvents, setHolidayEvents] = useState<HolidayEvent[]>([]);

  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [filters, setFilters] = useState<DiscoverFilters>(() =>
    filtersFromSearchParams(new URLSearchParams(searchParams.toString()))
  );
  const [filterOpen, setFilterOpen] = useState(false);

  // sync when URL changes externally
  useEffect(() => {
    setFilters(filtersFromSearchParams(new URLSearchParams(searchParams.toString())));
    setQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const fetchEvents = useCallback(
    async (nextOffset = 0, replace = true) => {
      if (nextOffset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const sp = new URLSearchParams(searchParams.toString());
        sp.set('limit', String(PAGE_SIZE));
        sp.set('offset', String(nextOffset));
        sp.set('days', String(60));

        // Do NOT forward holiday params to discover API
        sp.delete('holidays');
        sp.delete('holidayLocale');

        const res = await fetch('/api/discover?' + sp.toString());
        const json = await res.json();
        if (json.success) {
          setEvents((prev) => (replace ? json.data : [...prev, ...json.data]));
          setTotal(json.meta.total);
          setOffset(nextOffset + json.data.length);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchParams]
  );

  const fetchPrivateEvents = useCallback(
    async (nextOffset = 0, replace = true) => {
      if (nextOffset === 0) setLoading(true);
      else setLoadingMore(true);

      try {
        const sp = new URLSearchParams();
        sp.set('limit', String(PAGE_SIZE));
        sp.set('offset', String(nextOffset));

        const q = (searchParams.get('q') ?? '').trim();
        if (q) sp.set('q', q);

        const now = new Date();
        const start = new Date(now);
        const end = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        sp.set('start', start.toISOString());
        sp.set('end', end.toISOString());

        const res = await fetch('/api/private-events?' + sp.toString());
        const json = await res.json();
        if (json.success) {
          setPrivateEvents((prev) => (replace ? json.data : [...prev, ...json.data]));
          setTotal(json.total ?? null);
          setOffset(nextOffset + (json.data?.length ?? 0));
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [searchParams]
  );

  const fetchHolidays = useCallback(async () => {
    const sp = new URLSearchParams(searchParams.toString());
    const enabled = sp.get('holidays') === '1';
    if (!enabled) {
      setHolidayEvents([]);
      return;
    }

    const locale = (sp.get('holidayLocale') ?? 'MO').toUpperCase();

    // Align holiday window with discover window
    const now = new Date();
    const from = new Date(now);
    const to = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const res = await fetch(
      '/api/holidays?locale=' +
        encodeURIComponent(locale) +
        '&from=' +
        encodeURIComponent(from.toISOString()) +
        '&to=' +
        encodeURIComponent(to.toISOString())
    );
    const json = await res.json();
    if (json.success) setHolidayEvents(json.data);
  }, [searchParams]);

  useEffect(() => {
    setOffset(0);
    setTotal(null);
    if (mode === 'private') {
      setPrivateEvents([]);
      fetchPrivateEvents(0, true);
    } else {
      setEvents([]);
      fetchEvents(0, true);
    }
  }, [fetchEvents, fetchPrivateEvents, mode]);

  useEffect(() => {
    if (mode === 'public') fetchHolidays();
    else setHolidayEvents([]);
  }, [fetchHolidays, mode]);

  const availableNeighborhoods = useMemo(() => {
    return uniqSorted(events.map((e) => (e as any).region ?? (e as any).city ?? null));
  }, [events]);

  const availableCategories = useMemo(() => {
    // HK Discover PRD: fixed chips set
    if (city.toLowerCase() === 'hong kong') {
      return [...HONG_KONG_DISCOVER_CATEGORIES];
    }

    const all: string[] = [];
    for (const e of events as any[]) {
      const cats = e.categories;
      if (Array.isArray(cats)) all.push(...cats);
      else if (typeof cats === 'string' && cats.trim()) all.push(cats);
    }
    if (filters.showHolidays) all.push('Holiday');
    return uniqSorted(all);
  }, [city, events, filters.showHolidays]);

  const hasMore = total != null && offset < total;

  const onApplyFilters = () => {
    const next = applyFiltersToUrl(new URLSearchParams(searchParams.toString()), filters);
    router.replace('/discover?' + next.toString());
    setFilterOpen(false);
  };

  // query -> URL (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams.toString());
      const q = query.trim();
      if (q) next.set('q', q);
      else next.delete('q');
      next.delete('offset');
      router.replace('/discover?' + next.toString());
    }, 350);
    return () => clearTimeout(t);
  }, [query, router, searchParams]);

  const mergedEvents = useMemo(() => {
    const mappedHolidays: PublicEvent[] = holidayEvents.map((h) => ({
      id: h.id,
      title: h.title,
      start_at: h.start_at,
      venue_name: null,
      price_min: null,
      price_max: null,
      is_free: true,
      currency: 'MOP',
      images: [],
      categories: ['Holiday'],
      created_at: h.created_at,
      saved: false,
    }));

    const combined = [...mappedHolidays, ...events];
    combined.sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
    return combined;
  }, [events, holidayEvents]);

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--engaged-bg)' }}>
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3 space-y-3" style={{ background: 'var(--engaged-bg)' }}>
        {mode === 'public' && (
          <div className="flex items-center gap-2 h-8">
            <MapPin size={16} className="text-[#374151] flex-shrink-0" />
            <div className="relative flex items-center">
              <select
                id="discover-location"
                value={city}
                onChange={(e) => {
                  const nextCity = e.target.value;
                  const next = new URLSearchParams(searchParams.toString());
                  if (nextCity && nextCity !== 'Macau') next.set('city', nextCity);
                  else next.delete('city');
                  next.delete('offset');
                  router.replace('/discover?' + next.toString());
                }}
                className="appearance-none bg-transparent pr-5 text-sm font-semibold text-[#111827] outline-none cursor-pointer"
                aria-label="Select location"
              >
                {DISCOVER_LOCATIONS.map((loc) => (
                  <option key={loc.value} value={loc.value}>
                    {loc.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="text-[#6B7280] pointer-events-none absolute right-0" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full h-11 px-3">
            <Search size={16} className="text-[#9CA3AF] flex-shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={mode === 'public' ? 'Find things to do' : 'Search private events'}
              autoComplete="off"
              suppressHydrationWarning
              className="flex-1 text-sm font-medium text-[#111827] placeholder:text-[#9CA3AF] bg-transparent outline-none min-w-0"
            />
          </div>

          {mode === 'public' && (
            <button
              onClick={() => setFilterOpen(true)}
              className="w-10 h-10 flex items-center justify-center bg-white border border-[#E5E7EB] rounded-full flex-shrink-0"
              aria-label="Open filters"
            >
              <SlidersHorizontal size={16} className="text-[#6B7280]" />
            </button>
          )}
        </div>

        <div className="inline-flex bg-white border border-[#E5E7EB] rounded-full p-1 w-fit">
          <button
            className={`px-4 h-9 rounded-full text-sm font-semibold transition-colors ${
              mode === 'public' ? 'bg-[#111827] text-white' : 'text-[#111827]'
            }`}
            onClick={() => {
              const next = new URLSearchParams(searchParams.toString());
              next.set('mode', 'public');
              next.delete('offset');
              router.replace('/discover?' + next.toString());
            }}
          >
            Public
          </button>
          <button
            className={`px-4 h-9 rounded-full text-sm font-semibold transition-colors ${
              mode === 'private' ? 'bg-[#111827] text-white' : 'text-[#111827]'
            }`}
            onClick={() => {
              const next = new URLSearchParams(searchParams.toString());
              next.set('mode', 'private');
              next.delete('offset');
              // Private mode doesn't use discover filters
              next.delete('holidays');
              next.delete('holidayLocale');
              router.replace('/discover?' + next.toString());
            }}
          >
            Private
          </button>
        </div>

        {/* Quick category chips */}
        {mode === 'public' && availableCategories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none -mx-4 px-4">
            {filters.categories.length > 0 && (
              <button
                onClick={() => {
                  const next = applyFiltersToUrl(new URLSearchParams(searchParams.toString()), { ...filters, categories: [] });
                  router.replace('/discover?' + next.toString());
                }}
                className="flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold bg-[#111827] text-white flex items-center gap-1"
              >
                ✕ Clear
              </button>
            )}
            {availableCategories.slice(0, 12).map((cat) => {
              const active = filters.categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => {
                    const nextCats = active
                      ? filters.categories.filter((c) => c !== cat)
                      : [...filters.categories, cat];
                    const next = applyFiltersToUrl(new URLSearchParams(searchParams.toString()), { ...filters, categories: nextCats });
                    router.replace('/discover?' + next.toString());
                  }}
                  className={`flex-shrink-0 px-3 h-8 rounded-full text-xs font-semibold transition-colors ${
                    active
                      ? 'bg-[#3B82F6] text-white border border-[#3B82F6]'
                      : 'bg-white text-[#374151] border border-[#E5E7EB]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="px-4 space-y-3">
        {mode === 'public' && (
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#111827]">
              {filters.categories.length > 0
                ? `${filters.categories.join(' · ')}`
                : 'Popular near you'}
            </h2>
            {total != null && !loading && (
              <span className="text-xs text-[#9CA3AF] font-medium">{total} events</span>
            )}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
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

        {!loading && mode === 'public' && mergedEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">🎭</span>
            <h3 className="text-base font-semibold text-[#111827] mb-1">No events right now</h3>
            <p className="text-sm text-[#6B7280]">Check back soon — new events are added every 12 hours</p>
          </div>
        )}

        {!loading && mode === 'private' && privateEvents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <h3 className="text-base font-semibold text-[#111827] mb-1">No private events</h3>
            <p className="text-sm text-[#6B7280]">Create an event or join a shared calendar to see them here</p>
          </div>
        )}

        {!loading && mode === 'public' && (
          <div className="space-y-3">
            {mergedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {!loading && mode === 'private' && (
          <div className="space-y-3">
            {privateEvents.map((event) => (
              <PrivateEventCard key={event.id} event={event} />
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <button
            onClick={() => (mode === 'public' ? fetchEvents(offset, false) : fetchPrivateEvents(offset, false))}
            disabled={loadingMore}
            className="w-full py-2.5 text-sm font-semibold text-[#3B82F6] border border-[#E5E7EB] rounded-xl bg-white hover:bg-blue-50 transition-colors disabled:opacity-40"
          >
            {loadingMore ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading…
              </span>
            ) : 'Load more'}
          </button>
        )}
      </div>

      {mode === 'public' && (
        <DiscoverFilterModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          value={filters}
          onChange={setFilters}
          onApply={onApplyFilters}
          availableNeighborhoods={availableNeighborhoods}
          availableCategories={availableCategories}
        />
      )}

      <BottomTabBar />
    </div>
  );
}
