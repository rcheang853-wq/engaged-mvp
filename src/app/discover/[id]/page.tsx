'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ChevronLeft, Share2, Heart, CalendarDays,
  MapPin, X, Check, Loader2
} from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

interface PublicEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  timezone: string;
  venue_name: string | null;
  address: string | null;
  organizer_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_free: boolean | null;
  currency: string;
  images: string[];
  categories: string[];
  ticket_url: string | null;
  created_at: string;
}

interface Calendar { id: string; name: string; color: string; }

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDate(isoStr: string, tz = 'Asia/Macau') {
  return new Date(isoStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: tz,
  });
}

function formatPrice(event: PublicEvent): string {
  if (event.is_free) return 'Free';
  if (event.price_min != null) {
    const sym = event.currency === 'HKD' ? 'HK$' : `${event.currency} `;
    return `From ${sym}${event.price_min.toLocaleString()}`;
  }
  return '';
}

function isSaleEndingSoon(event: PublicEvent): boolean {
  const daysUntil = (new Date(event.start_at).getTime() - Date.now()) / 86400000;
  return daysUntil >= 0 && daysUntil <= 7;
}

// ── Add to Calendar Modal ────────────────────────────────────────────────────

function AddToCalendarModal({
  eventId,
  onClose,
  onSuccess,
}: {
  eventId: string;
  onClose: () => void;
  onSuccess: (calendarName: string) => void;
}) {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/calendars')
      .then(r => r.json())
      .then(d => { setCalendars(d.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function addToCalendar(cal: Calendar) {
    setAdding(cal.id);
    try {
      const res = await fetch(`/api/discover/${eventId}/add-to-calendar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calendar_id: cal.id }),
      });
      const json = await res.json();
      if (json.success) {
        onSuccess(cal.name);
      } else {
        alert(json.error ?? 'Failed to add event');
        setAdding(null);
      }
    } catch {
      alert('Something went wrong');
      setAdding(null);
    }
  }

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* Sheet */}
      <div className="relative w-full max-w-md bg-white rounded-t-3xl px-4 pt-4 pb-8 z-10">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#111827]">Add to Calendar</h3>
          <button onClick={onClose} className="p-1 text-[#6B7280]">
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-[#3B82F6]" />
          </div>
        ) : calendars.length === 0 ? (
          <p className="text-sm text-[#6B7280] text-center py-8">
            No calendars found. Create a calendar first.
          </p>
        ) : (
          <div className="space-y-2">
            {calendars.map(cal => (
              <button
                key={cal.id}
                onClick={() => addToCalendar(cal)}
                disabled={!!adding}
                className="w-full flex items-center gap-3 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl hover:bg-blue-50 transition-colors disabled:opacity-60"
              >
                <div
                  className="w-8 h-8 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: cal.color ?? '#3B82F6' }}
                />
                <span className="flex-1 text-left text-sm font-semibold text-[#111827]">
                  {cal.name}
                </span>
                {adding === cal.id && (
                  <Loader2 size={16} className="animate-spin text-[#3B82F6]" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Image Carousel ───────────────────────────────────────────────────────────

function HeroCarousel({ images }: { images: string[] }) {
  const [current, setCurrent] = useState(0);
  // Reorder: thumbnail (index 1, landscape) first, portrait second — max 3
  const ordered = images.length > 1
    ? [images[1], images[0], ...images.slice(2)].slice(0, 3)
    : images.slice(0, 3);

  if (ordered.length === 0) {
    return (
      <div className="w-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
        <span className="text-6xl">🎭</span>
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden aspect-[4/5] sm:aspect-[16/9] lg:aspect-[21/9]">
      {/* Images */}
      <div
        className="flex h-full transition-transform duration-300 ease-in-out"
        style={{ transform: `translateX(-${current * 100}%)`, width: `${ordered.length * 100}%` }}
      >
        {ordered.map((src, i) => (
          <div key={i} className="flex-shrink-0 h-full" style={{ width: `${100 / ordered.length}%` }}>
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover object-center"
              loading={i === 0 ? 'eager' : 'lazy'}
            />
          </div>
        ))}
      </div>

      {/* Dot indicators (only if >1 image) */}
      {ordered.length > 1 && (
        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
          {ordered.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all"
              style={{
                width: i === current ? 16 : 6,
                height: 6,
                background: i === current ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}

      {/* Tap zones for swiping on mobile */}
      {current > 0 && (
        <button
          onClick={() => setCurrent(c => c - 1)}
          className="absolute left-0 top-0 h-full w-1/3"
          aria-label="Previous image"
        />
      )}
      {current < ordered.length - 1 && (
        <button
          onClick={() => setCurrent(c => c + 1)}
          className="absolute right-0 top-0 h-full w-1/3"
          aria-label="Next image"
        />
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function PublicEventDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [showCalModal, setShowCalModal] = useState(false);
  const [addedTo, setAddedTo] = useState<string | null>(null);
  const [descExpanded, setDescExpanded] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/discover/${id}`)
      .then(r => r.json())
      .then(d => { setEvent(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function toggleSave() {
    if (!event) return;
    const method = saved ? 'DELETE' : 'POST';
    await fetch(`/api/discover/${event.id}/save`, { method });
    setSaved(!saved);
  }

  const priceStr = event ? formatPrice(event) : '';
  const endingSoon = event ? isSaleEndingSoon(event) : false;
  const shortDesc = event?.description?.slice(0, 120);
  const hasMore = (event?.description?.length ?? 0) > 120;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center pb-20">
        <Loader2 size={32} className="animate-spin text-[#3B82F6]" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3 pb-20">
        <p className="text-[#6B7280] text-sm">Event not found</p>
        <button onClick={() => router.push('/discover')} className="text-[#3B82F6] text-sm font-semibold">
          ← Back to Nearby
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-[calc(56px+64px)]">

      {/* ── Hero Carousel ──────────────────────────────────────────────────── */}
      <div className="relative w-full">
        <HeroCarousel images={event.images ?? []} />

        {/* Dark gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 40%, rgba(0,0,0,0.15) 100%)' }}
        />

        {/* Top nav row */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pointer-events-none">
          <button onClick={() => router.back()} className="p-1 pointer-events-auto">
            <ChevronLeft size={18} color="#FFFFFF" strokeWidth={2.5} />
          </button>
          <div className="flex items-center gap-3 pointer-events-auto">
            <button className="p-1"><Share2 size={18} color="#FFFFFF" /></button>
            <button onClick={toggleSave} className="p-1">
              <Heart size={18} color="#FFFFFF" className={saved ? 'fill-white' : ''} />
            </button>
          </div>
        </div>

        {/* "Sales end soon" badge — above dots */}
        {endingSoon && (
          <div className="absolute bottom-8 left-4 pointer-events-none">
            <span
              className="text-[10px] font-bold px-2 py-1 rounded-[10px]"
              style={{ background: '#D1FAE5', color: '#065F46' }}
            >
              Sales end soon
            </span>
          </div>
        )}
      </div>

      {/* ── Scrollable Body ─────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 space-y-3">

        {/* Title block */}
        <div>
          <h1 className="text-lg font-bold text-[#111827] leading-snug">{event.title}</h1>
          <p className="text-xs font-medium text-[#6B7280] mt-1">
            {[event.organizer_name, event.venue_name, event.categories?.[0]]
              .filter(Boolean).join(' · ')}
          </p>
        </div>

        {/* Date + Location card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3 space-y-2">
          <div className="flex items-center gap-2 h-5">
            <CalendarDays size={16} className="text-[#6B7280] flex-shrink-0" />
            <span className="text-sm font-medium text-[#374151]">
              {formatDate(event.start_at, event.timezone)}
            </span>
          </div>
          {(event.venue_name || event.address) && (
            <div className="flex items-center gap-2 h-5">
              <MapPin size={16} className="text-[#6B7280] flex-shrink-0" />
              <span className="text-sm font-medium text-[#374151]">
                {event.venue_name ?? event.address}
              </span>
            </div>
          )}
        </div>

        {/* Organizer card */}
        {event.organizer_name && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl px-4 flex items-center justify-between" style={{ height: 72 }}>
            <div className="flex items-center gap-2">
              {/* Avatar placeholder */}
              <div className="w-8 h-8 rounded-full flex-shrink-0 bg-[#EC4899] flex items-center justify-center">
                <span className="text-white text-xs font-bold">
                  {event.organizer_name[0]?.toUpperCase()}
                </span>
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] leading-tight">{event.organizer_name}</p>
                <p className="text-[10px] font-medium text-[#6B7280]">Organizer</p>
              </div>
            </div>
            <button
              className="text-xs font-semibold text-[#111827] px-3 py-1 rounded-[14px]"
              style={{ background: '#F3F4F6', height: 28 }}
            >
              Follow
            </button>
          </div>
        )}

        {/* Overview / Description card */}
        {event.description && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-3 space-y-2">
            <h2 className="text-sm font-bold text-[#111827]">Overview</h2>
            <p className="text-xs text-[#374151] leading-relaxed">
              {descExpanded ? event.description : shortDesc}
              {hasMore && !descExpanded && '…'}
            </p>
            {hasMore && (
              <button
                onClick={() => setDescExpanded(!descExpanded)}
                className="text-xs font-semibold text-[#3B82F6]"
              >
                {descExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Ticket link */}
        {event.ticket_url && (
          <a
            href={event.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs font-semibold text-[#3B82F6] py-1"
          >
            View on MacauTicket.com →
          </a>
        )}
      </div>

      {/* ── Sticky CTA Bottom Bar ───────────────────────────────────────────── */}
      <div
        className="fixed bottom-16 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] flex items-center justify-between px-4"
        style={{ height: 56 }}
      >
        <span className="text-sm font-bold text-[#111827]">{priceStr}</span>

        {addedTo ? (
          <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 px-4 py-1.5 rounded-2xl">
            <Check size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700">Added to {addedTo}</span>
          </div>
        ) : (
          <button
            onClick={() => setShowCalModal(true)}
            className="text-xs font-semibold text-white px-4 rounded-2xl"
            style={{ background: '#3B82F6', height: 32 }}
          >
            Add to calendar
          </button>
        )}
      </div>

      {/* Bottom tab bar */}
      <BottomTabBar />

      {/* Add to Calendar modal */}
      {showCalModal && (
        <AddToCalendarModal
          eventId={event.id}
          onClose={() => setShowCalModal(false)}
          onSuccess={(name) => {
            setAddedTo(name);
            setShowCalModal(false);
          }}
        />
      )}
    </div>
  );
}
