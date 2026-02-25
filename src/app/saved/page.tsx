'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, CalendarDays, ChevronRight, LogIn } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import EventCard, { PublicEvent } from '@/components/discover/EventCard';

type TabKey = 'public' | 'calendars';

// ── Segmented Tab Control ─────────────────────────────────────────────────────

function SegmentedControl({
  tabs, active, onChange,
}: {
  tabs: { key: TabKey; label: string }[];
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div className="flex p-1 gap-1" style={{ background: '#F3F4F6', borderRadius: 16, height: 32 }}>
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className="flex-1 text-xs font-semibold transition-colors"
          style={{
            borderRadius: 12,
            background: active === key ? '#FFFFFF' : 'transparent',
            color: active === key ? '#111827' : '#6B7280',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Auth Gate — shown when user not signed in ─────────────────────────────────

function AuthGate() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-3">
        <LogIn size={28} className="text-[#3B82F6]" />
      </div>
      <h3 className="text-sm font-semibold text-[#111827] mb-1">Sign in to see your saved events</h3>
      <p className="text-xs text-[#6B7280] mb-5">Save events from the Nearby tab and find them all here.</p>
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <Link
          href="/dev-login"
          className="text-xs font-semibold text-white px-4 py-2 rounded-2xl text-center"
          style={{ background: '#3B82F6' }}
        >
          Dev login
        </Link>
        <Link
          href="/auth/signin"
          className="text-xs font-semibold text-[#6B7280] px-4 py-2 rounded-2xl text-center"
          style={{ background: '#F3F4F6' }}
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}

// ── Public Tab ────────────────────────────────────────────────────────────────

function PublicTab() {
  const [events, setEvents] = useState<PublicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    fetch('/api/discover/saved')
      .then(r => {
        if (r.status === 401) { setAuthed(false); setLoading(false); return null; }
        return r.json();
      })
      .then(d => {
        if (d) { setEvents(d.data ?? []); setLoading(false); }
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl h-[92px] animate-pulse" />
      ))}
    </div>
  );

  if (!authed) return <AuthGate />;

  if (events.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-3">
        <Heart size={28} className="text-red-300" />
      </div>
      <h3 className="text-sm font-semibold text-[#111827] mb-1">No saved events yet</h3>
      <p className="text-xs text-[#6B7280] mb-4">Heart events on the Nearby tab to save them here</p>
      <Link
        href="/discover"
        className="text-xs font-semibold text-white px-4 py-2 rounded-2xl"
        style={{ background: '#3B82F6' }}
      >
        Browse Nearby
      </Link>
    </div>
  );

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-[#111827]">Public events</h2>
      {events.map(event => (
        <EventCard key={event.id} event={{ ...event, saved: true }} />
      ))}
    </div>
  );
}

// ── Calendars Tab ─────────────────────────────────────────────────────────────

function CalendarsTab() {
  const [authed, setAuthed] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/calendars')
      .then(r => { if (r.status === 401) setAuthed(false); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1,2].map(i => (
        <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl h-[80px] animate-pulse" />
      ))}
    </div>
  );

  if (!authed) return <AuthGate />;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-[#111827]">From calendars</h2>
      <div className="flex flex-col items-center py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center mb-3">
          <CalendarDays size={22} className="text-[#3B82F6]" />
        </div>
        <p className="text-xs font-medium text-[#6B7280]">
          Star events in your calendars to see them here.
        </p>
        <Link href="/calendars" className="mt-3 text-xs font-semibold text-[#3B82F6]">
          Go to Calendars →
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TABS: { key: TabKey; label: string }[] = [
  { key: 'public',    label: 'Public'    },
  { key: 'calendars', label: 'Calendars' },
];

export default function SavedPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('public');

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      <div className="flex items-center justify-center px-4 bg-[#F9FAFB]" style={{ height: 56, paddingTop: 40 }}>
        <h1 className="text-base font-bold text-[#111827]">Saved</h1>
      </div>
      <div className="px-4 mb-4">
        <SegmentedControl tabs={TABS} active={activeTab} onChange={setActiveTab} />
      </div>
      <div className="px-4">
        {activeTab === 'public'    && <PublicTab />}
        {activeTab === 'calendars' && <CalendarsTab />}
      </div>
      <BottomTabBar />
    </div>
  );
}
