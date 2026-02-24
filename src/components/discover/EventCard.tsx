'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';

export interface PublicEvent {
  id: string;
  title: string;
  start_at: string;
  venue_name: string | null;
  price_min: number | null;
  price_max: number | null;
  is_free: boolean | null;
  currency: string;
  images: string[];
  categories: string[];
  created_at: string;
  saved?: boolean;
}

interface EventCardProps {
  event: PublicEvent;
  isNew?: boolean; // show "Just added" badge
}

function formatPrice(event: PublicEvent): string {
  if (event.is_free) return 'Free';
  if (event.price_min != null) {
    const currency = event.currency === 'HKD' ? 'HK$' : event.currency + ' ';
    return `From ${currency}${event.price_min.toLocaleString()}`;
  }
  return '';
}

function formatDate(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Macau',
  });
}

// "Just added" if ingested within 48h
function isJustAdded(event: PublicEvent): boolean {
  const age = Date.now() - new Date(event.created_at).getTime();
  return age < 48 * 60 * 60 * 1000;
}

export default function EventCard({ event }: EventCardProps) {
  const [saved, setSaved] = useState(event.saved ?? false);
  const [saving, setSaving] = useState(false);
  const thumbnail = event.images?.[1] ?? event.images?.[0] ?? null;
  const priceStr = formatPrice(event);
  const newBadge = isJustAdded(event);

  async function toggleSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (saving) return;
    setSaving(true);
    try {
      const method = saved ? 'DELETE' : 'POST';
      await fetch(`/api/discover/${event.id}/save`, { method });
      setSaved(!saved);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  return (
    <Link href={`/discover/${event.id}`} className="block">
      <div
        className="bg-white border border-[#E5E7EB] rounded-2xl p-3 flex items-center gap-3"
        style={{ minHeight: 92 }}
      >
        {/* Thumbnail */}
        <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-gray-100">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={event.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
              <span className="text-blue-400 text-xl">🎭</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 justify-center">
          {/* Title */}
          <p className="text-sm font-bold text-[#111827] truncate leading-snug">
            {event.title}
          </p>

          {/* Date + venue */}
          <p className="text-xs font-medium text-[#6B7280] truncate">
            {formatDate(event.start_at)}
            {event.venue_name ? ` · ${event.venue_name}` : ''}
          </p>

          {/* Price + badges */}
          <div className="flex items-center gap-2">
            {priceStr && (
              <span className="text-xs font-semibold text-[#111827]">{priceStr}</span>
            )}

            {/* "Just added" badge */}
            {newBadge && (
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-lg"
                style={{ background: '#FEF3C7', color: '#92400E' }}
              >
                Just added
              </span>
            )}

            {/* "Add" chip */}
            {!newBadge && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-[10px]"
                style={{ background: '#DBEAFE', color: '#2563EB' }}
              >
                Add
              </span>
            )}
          </div>
        </div>

        {/* Heart */}
        <button
          onClick={toggleSave}
          disabled={saving}
          className="flex-shrink-0 p-1 -mr-1 transition-transform active:scale-90"
          aria-label={saved ? 'Unsave event' : 'Save event'}
        >
          <Heart
            size={16}
            className={saved ? 'text-red-500 fill-red-500' : 'text-[#9CA3AF]'}
          />
        </button>
      </div>
    </Link>
  );
}
