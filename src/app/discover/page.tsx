'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, Clock, Compass, CalendarPlus } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PublicEvent {
  id: string;
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  location?: string;
  categories?: string[];   // API returns an array, not a singular field
  color?: string;
  organizer?: string;
  saved?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'all',      label: 'All',       emoji: '\uD83C\uDF1F' },
  { id: 'music',    label: 'Music',     emoji: '\uD83C\uDFB8' },
  { id: 'food',     label: 'Food',      emoji: '\uD83C\uDF73' },
  { id: 'sport',    label: 'Sport',     emoji: '\uD83C\uDFC6' },
  { id: 'art',      label: 'Art',       emoji: '\uD83C\uDFA8' },
  { id: 'social',   label: 'Social',    emoji: '\uD83E\uDD1D' },
  { id: 'outdoor',  label: 'Outdoor',   emoji: '\uD83C\uDF33' },
  { id: 'wellness', label: 'Wellness',  emoji: '\uD83E\uDDD8' },
];

const CATEGORY_COLOR: Record<string, string> = {
  music:    '#8B5CF6',
  food:     '#F59E0B',
  sport:    '#22C55E',
  art:      '#EC4899',
  social:   '#2563EB',
  outdoor:  '#14B8A6',
  wellness: '#F97316',
  default:  '#2563EB',
};

const ARTWORK_MAP: [RegExp, string][] = [
  [/gym|sport|boulder|climb|bike|cycle|run|jog|swim|hike|trail|volley|football|basketball|tennis/i, '/artworks/bicycle_art.png'],
  [/music|band|guitar|concert|gig|jam|sing/i,  '/artworks/guitar_music.png'],
  [/food|eat|brunch|lunch|dinner|restaurant|cafe|drink|coffee|beer|wine|bar/i, '/artworks/food_plate.png'],
  [/movie|film|cinema/i, '/artworks/camera_spotlight.png'],
  [/photo|camera|shoot/i, '/artworks/camera_spotlight.png'],
  [/hike|walk|trail|outdoor/i, '/artworks/walking_woman.png'],
  [/party|birthday|celebration/i, '/artworks/flower_cluster.png'],
];

function artworkForTitle(title: string): string {
  for (const [re, src] of ARTWORK_MAP) {
    if (re.test(title)) return src;
  }
  return '/artworks/walking_man.png';
}

function colorForCategory(cat?: string): string {
  return CATEGORY_COLOR[cat ?? 'default'] ?? CATEGORY_COLOR.default;
}

function formatEventTime(start_at: string, end_at?: string): string {
  const start = new Date(start_at);
  const now = new Date();
  const isToday = start.toDateString() === now.toDateString();
  const isTomorrow = new Date(now.getTime() + 86400000).toDateString() === start.toDateString();

  const datePart = isToday
    ? 'Today'
    : isTomorrow
    ? 'Tomorrow'
    : start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const timePart = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${datePart} \u00B7 ${timePart}`;
}

// ── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div
      className="rounded-[20px] overflow-hidden animate-pulse"
      style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
    >
      <div className="h-[140px]" style={{ background: 'var(--engaged-border)' }} />
      <div className="p-4 space-y-2">
        <div className="h-4 rounded-full w-3/4" style={{ background: 'var(--engaged-border)' }} />
        <div className="h-3 rounded-full w-1/2" style={{ background: 'var(--engaged-border)' }} />
      </div>
    </div>
  );
}

// ── Event card ────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: PublicEvent }) {
  // Use first category from the array for colour + display
  const primaryCategory = event.categories?.[0];
  const color   = colorForCategory(primaryCategory);
  const artSrc  = artworkForTitle(event.title);
  const [saved, setSaved] = useState(event.saved ?? false);

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSaved(s => !s);
    try {
      // Correct route: /api/discover/[id]/save
      await fetch(`/api/discover/${event.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ save: !saved }),
      });
    } catch {/* ignore */}
  };

  return (
    <div
      className="rounded-[20px] overflow-hidden relative"
      style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
    >
      {/* Hero area */}
      <div
        className="relative h-[130px] flex items-end p-4 overflow-hidden"
        style={{ background: `${color}18` }}
      >
        {/* Category pill */}
        {primaryCategory && (
          <div
            className="absolute top-3 left-3 flex items-center gap-1 h-6 px-2.5 rounded-full text-[10px] font-bold"
            style={{ background: color, color: '#fff' }}
          >
            {CATEGORIES.find(c => c.id === primaryCategory)?.emoji ?? ''}{' '}
            {primaryCategory.charAt(0).toUpperCase() + primaryCategory.slice(1)}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSave}
          className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{
            background: saved ? '#FFF1F2' : '#fff',
            border: '1.5px solid var(--engaged-border)',
          }}
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill={saved ? '#F43F5E' : 'none'}
            stroke={saved ? '#F43F5E' : 'var(--engaged-text3)'} strokeWidth="2.5"
          >
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
          </svg>
        </button>

        {/* Artwork */}
        <img
          src={artSrc}
          alt=""
          aria-hidden
          className="absolute right-3 bottom-0 h-[110px] w-auto opacity-80 pointer-events-none select-none"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.08))' }}
        />

        {/* Left color bar */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: color, borderRadius: '20px 0 0 0' }}
        />
      </div>

      {/* Content */}
      <div className="px-4 py-3">
        <h3
          className="text-[15px] font-black tracking-[-0.03em] leading-snug mb-1"
          style={{ color: 'var(--engaged-text)' }}
        >
          {event.title}
        </h3>

        <div className="flex items-center gap-1 mb-1" style={{ color: 'var(--engaged-text2)' }}>
          <Clock size={11} style={{ flexShrink: 0 }} />
          <span className="text-[11px] font-semibold">{formatEventTime(event.start_at, event.end_at)}</span>
        </div>

        {event.location && (
          <div className="flex items-center gap-1" style={{ color: 'var(--engaged-text3)' }}>
            <MapPin size={11} style={{ flexShrink: 0 }} />
            <span className="text-[11px] truncate">{event.location}</span>
          </div>
        )}

        {event.organizer && (
          <div className="mt-2 flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold flex-shrink-0"
              style={{ background: `${color}22`, color }}
            >
              {event.organizer[0]?.toUpperCase()}
            </div>
            <span className="text-[11px] font-medium truncate" style={{ color: 'var(--engaged-text3)' }}>
              By {event.organizer}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Featured row card (wider horizontal card) ─────────────────────────────────

function FeaturedCard({ event }: { event: PublicEvent }) {
  const primaryCategory = event.categories?.[0];
  const color  = colorForCategory(primaryCategory);
  const artSrc = artworkForTitle(event.title);

  return (
    <div
      className="flex-shrink-0 w-[260px] rounded-[20px] overflow-hidden relative"
      style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}
    >
      <div
        className="relative h-[120px] flex items-end overflow-hidden"
        style={{ background: `${color}22` }}
      >
        {primaryCategory && (
          <div
            className="absolute top-2 left-3 flex items-center gap-1 h-5 px-2 rounded-full text-[9px] font-bold"
            style={{ background: color, color: '#fff' }}
          >
            {CATEGORIES.find(c => c.id === primaryCategory)?.emoji ?? ''}{' '}
            {primaryCategory.charAt(0).toUpperCase() + primaryCategory.slice(1)}
          </div>
        )}
        <img
          src={artSrc}
          alt=""
          aria-hidden
          className="absolute right-2 bottom-0 h-[100px] w-auto opacity-85 pointer-events-none select-none"
        />
        <div
          className="absolute left-0 top-0 bottom-0 w-1"
          style={{ background: color, borderRadius: '20px 0 0 0' }}
        />
      </div>

      <div className="px-3 py-2.5">
        <h3 className="text-[13px] font-black tracking-[-0.03em] leading-snug mb-1 truncate" style={{ color: 'var(--engaged-text)' }}>
          {event.title}
        </h3>
        <div className="flex items-center gap-1" style={{ color: 'var(--engaged-text2)' }}>
          <Clock size={10} style={{ flexShrink: 0 }} />
          <span className="text-[10px] font-semibold truncate">{formatEventTime(event.start_at)}</span>
        </div>
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mb-3"
        style={{ background: 'var(--engaged-blue-lt)' }}
      >
        <Compass size={28} style={{ color: 'var(--engaged-blue)' }} />
      </div>
      <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--engaged-text)' }}>
        Nothing here yet
      </h3>
      <p className="text-xs" style={{ color: 'var(--engaged-text2)' }}>
        Public events near you will appear here
      </p>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [events, setEvents]       = useState<PublicEvent[]>([]);
  const [loading, setLoading]     = useState(true);
  const [query, setQuery]         = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [focused, setFocused]     = useState(false);

  useEffect(() => {
    fetch('/api/discover')
      .then(r => r.json())
      .then(d => { setEvents(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = events;
    if (activeCategory !== 'all') {
      // categories is an array from the API — check if it includes the selected chip
      result = result.filter(ev => ev.categories?.includes(activeCategory));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(ev =>
        ev.title.toLowerCase().includes(q) ||
        ev.location?.toLowerCase().includes(q) ||
        ev.category?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [events, activeCategory, query]);

  // First 5 as "featured" (horizontal scroll), rest as grid
  const featured = filtered.slice(0, 5);
  const grid     = filtered.slice(5);

  return (
    <div className="min-h-screen pb-20 flex flex-col" style={{ background: 'var(--engaged-bg)' }}>

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-30 px-4 pt-12 pb-3" style={{ background: 'var(--engaged-bg)' }}>

        {/* Title row */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] mb-0.5" style={{ color: 'var(--engaged-text3)' }}>
              Explore
            </p>
            <h1 className="text-[34px] font-black tracking-[-0.05em] leading-none" style={{ color: 'var(--engaged-text)' }}>
              Discover
            </h1>
          </div>

          {/* Artwork top-right */}
          <img
            src="/artworks/walking_woman.png"
            alt=""
            aria-hidden
            className="h-16 w-auto opacity-70 pointer-events-none select-none"
            style={{ transform: 'scaleX(-1)', marginBottom: -4 }}
          />
        </div>

        {/* Search bar */}
        <div
          className="flex items-center gap-2 rounded-[16px] px-3 h-11 mb-3 transition-all"
          style={{
            background: '#fff',
            border: `1.5px solid ${focused ? 'var(--engaged-blue)' : 'var(--engaged-border)'}`,
          }}
        >
          <Search size={16} style={{ color: 'var(--engaged-text3)', flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder="Search events, places\u2026"
            className="flex-1 text-sm bg-transparent outline-none"
            style={{
              color: 'var(--engaged-text)',
              fontFamily: 'inherit',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: 'var(--engaged-border)' }}
            >
              <svg width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className="flex-shrink-0 flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-bold transition-all"
              style={{
                background: activeCategory === cat.id ? 'var(--engaged-blue)' : '#fff',
                color: activeCategory === cat.id ? '#fff' : 'var(--engaged-text2)',
                border: `1.5px solid ${activeCategory === cat.id ? 'var(--engaged-blue)' : 'var(--engaged-border)'}`,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: 13 }}>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto">

        {loading ? (
          <div className="px-4 pt-2 space-y-4">
            <div className="flex gap-3 overflow-x-hidden">
              {[1, 2].map(i => (
                <div key={i} className="flex-shrink-0 w-[260px] h-[196px] rounded-[20px] animate-pulse" style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }} />
              ))}
            </div>
            {[1, 2, 3].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* Featured horizontal scroll */}
            {featured.length > 0 && !query && (
              <div className="mb-5">
                <div className="flex items-center justify-between px-4 mb-3 mt-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--engaged-text3)' }}>
                    Featured
                  </span>
                  <span className="text-[11px] font-bold" style={{ color: 'var(--engaged-blue)' }}>See all</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-1 px-4" style={{ scrollbarWidth: 'none' }}>
                  {featured.map(ev => (
                    <FeaturedCard key={ev.id} event={ev} />
                  ))}
                </div>
              </div>
            )}

            {/* Grid list */}
            <div className="px-4 pb-4">
              {(!query && grid.length > 0) && (
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: 'var(--engaged-text3)' }}>
                    Nearby
                  </span>
                </div>
              )}

              {(query ? filtered : grid).length > 0 ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {(query ? filtered : grid).map(ev => (
                    <EventCard key={ev.id} event={ev} />
                  ))}
                </div>
              ) : null}
            </div>
          </>
        )}

        {/* Artwork footer band */}
        {!loading && (
          <div className="relative h-24 mx-4 mt-2 overflow-hidden flex items-end justify-between pointer-events-none select-none pb-2">
            <img src="/artworks/walking_man.png" alt="" aria-hidden className="h-20 w-auto opacity-55" />
            <img src="/artworks/flower_cluster.png" alt="" aria-hidden className="h-20 w-auto opacity-55" />
          </div>
        )}
      </div>

      {/* ── FAB: suggest event ── */}
      <button
        className="fixed right-4 bottom-[80px] flex items-center gap-2 h-12 px-4 rounded-full z-40"
        style={{
          background: 'var(--engaged-blue)',
          boxShadow: '0 6px 24px rgba(37,99,235,.4)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <CalendarPlus size={18} />
        Add event
      </button>

      <BottomTabBar />
    </div>
  );
}
