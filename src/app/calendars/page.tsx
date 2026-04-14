'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Users, Search } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

interface CalendarMember {
  user_id: string;
  role: string;
  profiles: { full_name: string; avatar_url: string | null };
}

interface SharedCalendar {
  id: string;
  type: 'personal' | 'shared';
  name: string;
  description: string | null;
  color: string;
  calendar_members: CalendarMember[];
}

function calendarEmoji(name: string): string {
  const n = name.toLowerCase();
  if (/music|band|guitar|rehearsal|concert|gig/.test(n)) return '\uD83C\uDFB8';
  if (/food|eat|brunch|lunch|dinner|cook|cafe|restaurant/.test(n)) return '\uD83C\uDF73';
  if (/sport|gym|run|hike|cycle|bike|climb|swim|beach|volley/.test(n)) return '\uD83C\uDFC4';
  if (/photo|camera|film|movie|art/.test(n)) return '\uD83D\uDCF7';
  if (/travel|trip|adventure/.test(n)) return '\u2708\uFE0F';
  if (/family/.test(n)) return '\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67';
  if (/work|office|meeting/.test(n)) return '\uD83D\uDCBC';
  return '\uD83D\uDCC5';
}

const ACCENT_COLORS: Record<string, string> = {
  '#2563EB': '#2563EB', '#22C55E': '#22C55E', '#8B5CF6': '#8B5CF6',
  '#EC4899': '#EC4899', '#F59E0B': '#F59E0B', '#14B8A6': '#14B8A6', '#F97316': '#F97316',
};
const SWATCH_BG: Record<string, string> = {
  '#2563EB': '#EEF4FF', '#22C55E': '#F0FDF4', '#8B5CF6': '#F5F3FF',
  '#EC4899': '#FDF2F8', '#F59E0B': '#FFFBEB', '#14B8A6': '#F0FDFA', '#F97316': '#FFF7ED',
};

function MemberAvatars({ members }: { members: CalendarMember[] }) {
  const BG = ['#FDE68A', '#BBF7D0', '#BFDBFE', '#EDE9FE', '#FCE7F3'];
  const FG = ['#92400E', '#166534', '#1E40AF', '#5B21B6', '#9D174D'];
  const shown = members.slice(0, 4);
  const extra = members.length - shown.length;
  return (
    <div className="flex items-center mt-2">
      {shown.map((m, i) => (
        <div
          key={m.user_id}
          className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold overflow-hidden"
          style={{ background: m.profiles?.avatar_url ? undefined : BG[i % BG.length], color: FG[i % FG.length], marginRight: '-6px' }}
        >
          {m.profiles?.avatar_url
            ? <img src={m.profiles.avatar_url} alt={m.profiles.full_name} className="w-full h-full object-cover" />
            : (m.profiles?.full_name?.[0] ?? '?').toUpperCase()}
        </div>
      ))}
      {extra > 0 && <span className="text-[11px] font-semibold ml-3" style={{ color: 'var(--engaged-text3)' }}>+{extra}</span>}
      {members.length > 0 && <span className="text-[11px] ml-2" style={{ color: 'var(--engaged-text3)' }}>{members.length} member{members.length !== 1 ? 's' : ''}</span>}
    </div>
  );
}

export default function CalendarsPage() {
  const [calendars, setCalendars] = useState<SharedCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  const personal = calendars.filter(c => c.type === 'personal');
  const shared   = calendars.filter(c => c.type !== 'personal');

  useEffect(() => {
    fetch('/api/calendars')
      .then(r => r.json())
      .then(d => { setCalendars(d.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--engaged-bg)' }}>
      <div className="sticky top-0 z-30 px-4 pt-12 pb-3" style={{ background: 'var(--engaged-bg)' }}>
        <div className="flex items-center gap-3">
          <h1 className="flex-1 text-2xl font-black tracking-[-0.05em]" style={{ color: 'var(--engaged-text)' }}>My Calendars</h1>
          <Link href="/search" className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }} aria-label="Search">
            <Search size={15} style={{ color: 'var(--engaged-text2)' }} />
          </Link>
          <Link href="/calendars/new" className="flex items-center gap-1 px-3 h-9 rounded-2xl text-sm font-bold text-white" style={{ background: 'var(--engaged-blue)' }}>
            <Plus size={15} strokeWidth={2.5} />New
          </Link>
        </div>
        {!loading && <p className="text-[13px] mt-1" style={{ color: 'var(--engaged-text2)' }}>{calendars.length} total &middot; {shared.length} shared</p>}
      </div>

      <div className="max-w-2xl mx-auto">
        {loading ? (
          <div className="pt-2">{[1,2,3].map(i => <div key={i} className="mx-4 mb-3 rounded-2xl p-4 h-24 animate-pulse" style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }} />)}</div>
        ) : calendars.length === 0 ? <EmptyState /> : (
          <>
            {personal.length > 0 && <section><SectionLabel>Personal</SectionLabel>{personal.map(cal => <CalendarCard key={cal.id} cal={cal} />)}</section>}
            {shared.length > 0 && <section><SectionLabel>Shared with Friends</SectionLabel>{shared.map(cal => <CalendarCard key={cal.id} cal={cal} />)}</section>}
          </>
        )}

        {calendars.length > 0 && (
          <Link href="/join" className="mx-4 mt-2 mb-4 flex items-center justify-center gap-2 text-sm font-bold rounded-2xl py-3.5" style={{ background: '#fff', border: '1.5px dashed var(--engaged-border)', color: 'var(--engaged-blue)' }}>
            <Users size={15} />Join with invite code
          </Link>
        )}

        <div className="relative h-24 overflow-hidden mx-4 flex items-end justify-between px-2">
          <img src="/artworks/walking_woman.png" alt="" aria-hidden className="h-20 w-auto opacity-70" style={{ transform: 'scaleX(-1)' }} />
          <img src="/artworks/tall_woman.png" alt="" aria-hidden className="h-24 w-auto opacity-70" />
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-extrabold tracking-[0.09em] uppercase px-5 mt-5 mb-2" style={{ color: 'var(--engaged-text3)' }}>{children}</p>;
}

function CalendarCard({ cal }: { cal: SharedCalendar }) {
  const accent   = ACCENT_COLORS[cal.color] ?? '#2563EB';
  const swatchBg = SWATCH_BG[cal.color] ?? '#EEF4FF';
  const emoji    = calendarEmoji(cal.name);
  return (
    <Link href={`/calendars/${cal.id}`} className="block mx-4 mb-2.5">
      <div className="flex items-center gap-3.5 p-3.5 rounded-2xl transition-shadow hover:shadow-md" style={{ background: '#fff', border: '1.5px solid var(--engaged-border)', borderLeft: `4px solid ${accent}` }}>
        <div className="w-12 h-12 rounded-[14px] flex items-center justify-center text-2xl flex-shrink-0" style={{ background: swatchBg }}>{emoji}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-extrabold tracking-tight truncate" style={{ color: 'var(--engaged-text)' }}>{cal.name}</p>
          {cal.description && <p className="text-[12px] truncate mt-0.5" style={{ color: 'var(--engaged-text2)' }}>{cal.description}</p>}
          {cal.type === 'personal'
            ? <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold" style={{ background: '#F5F3FF', color: '#8B5CF6' }}>Personal</span>
            : <MemberAvatars members={cal.calendar_members ?? []} />}
        </div>
        <svg width="18" height="18" fill="none" stroke="var(--engaged-border)" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6" /></svg>
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-8">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-4 text-4xl" style={{ background: 'var(--engaged-blue-lt)' }}>{'\uD83D\uDCC5'}</div>
      <h2 className="text-base font-extrabold mb-1" style={{ color: 'var(--engaged-text)' }}>No calendars yet</h2>
      <p className="text-sm mb-6" style={{ color: 'var(--engaged-text2)' }}>Create a shared calendar or join one with an invite code</p>
      <div className="flex gap-3">
        <Link href="/calendars/new" className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: 'var(--engaged-blue)' }}>Create Calendar</Link>
        <Link href="/join" className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: '#F3F4F6', color: '#374151' }}>Join with Code</Link>
      </div>
    </div>
  );
}
