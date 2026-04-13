'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, Send, MoreVertical, Check, X, HelpCircle, Tag, Edit, Trash2, Calendar, Share2 } from 'lucide-react';
import { EventDetailSkeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { authClient } from '@/lib/supabase/auth';

interface Comment {
  id: string;
  body: string;
  created_at: string;
  profiles: { id: string; full_name: string; avatar_url: string | null };
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  location: string | null;
  color: string | null;
  category_main: string | null;
  tags: string[] | null;
  discoverable_by_others: boolean;
  created_by: string;
  viewer_is_owner?: boolean;
  profiles: { id: string; full_name: string; avatar_url: string | null };
  event_comments: Comment[];
}

const RSVP_OPTIONS = [
  { value: 'going', label: 'Going', icon: Check, activeCls: 'bg-green-500 border-green-500 text-white' },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle, activeCls: 'bg-yellow-400 border-yellow-400 text-white' },
  { value: 'not_going', label: "Can't go", icon: X, activeCls: 'bg-red-400 border-red-400 text-white' },
];

export default function EventDetailPage() {
  const { id, eventId } = useParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const toast = useToast();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [rsvp, setRsvp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savingDiscoverable, setSavingDiscoverable] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    authClient.getCurrentUser().then((u) => setCurrentUserId(u?.id ?? null)).catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch(`/api/calendars/${id}/events/${eventId}`).then(r => r.json()),
      fetch(`/api/calendars/${id}/events/${eventId}/comments`).then(r => r.json()),
    ]).then(([evt, cmts]) => {
      setEvent(evt.data);
      setComments(cmts.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id, eventId]);

  const sendComment = async () => {
    if (!commentText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/calendars/${id}/events/${eventId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: commentText.trim() }),
      });
      const d = await res.json();
      if (d.success) {
        setComments(prev => [...prev, d.data]);
        setCommentText('');
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        toast.error('Failed to add comment');
      }
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this event?')) return;
    try {
      const res = await fetch(`/api/calendars/${id}/events/${eventId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Event deleted');
        router.replace(`/calendars/${id}`);
      } else {
        toast.error('Failed to delete event');
      }
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const toggleDiscoverable = async () => {
    if (!event || savingDiscoverable) return;

    const nextDiscoverable = !event.discoverable_by_others;
    setSavingDiscoverable(true);
    try {
      const res = await fetch(`/api/calendars/${id}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discoverable_by_others: nextDiscoverable }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) {
        toast.error('Failed to update Discover setting');
        return;
      }
      setEvent((prev) => prev ? { ...prev, discoverable_by_others: nextDiscoverable } : prev);
      toast.success(nextDiscoverable ? 'Event can appear in Discover' : 'Event removed from Discover');
    } catch {
      toast.error('Failed to update Discover setting');
    } finally {
      setSavingDiscoverable(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="h-40 bg-blue-500" />
        <EventDetailSkeleton />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Calendar size={28} className="text-gray-400" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Event not found</h2>
        <p className="text-sm text-gray-500 mb-6 max-w-xs">This event may have been deleted or you don't have permission to view it.</p>
        <button
          onClick={() => router.back()}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  const eventColor = event.color || '#3B82F6';
  const eventTags = event.tags ?? [];
  const isOwner = event.viewer_is_owner ?? !!(currentUserId && event.created_by === currentUserId);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero header */}
      <div
        className="relative px-4 pt-12 pb-8"
        style={{ background: `linear-gradient(160deg, ${eventColor} 0%, ${eventColor}CC 100%)` }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 0%, transparent 50%)' }} />

        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 w-9 h-9 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-sm hover:bg-black/30 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="absolute top-4 right-4 flex items-center gap-2">
          <button
            className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-sm hover:bg-black/30 transition-colors"
            aria-label="Share"
            onClick={() => navigator.share?.({ title: event.title, url: window.location.href })}
          >
            <Share2 size={16} />
          </button>
          {isOwner && (
            <button
              className="w-9 h-9 rounded-full bg-black/20 flex items-center justify-center text-white backdrop-blur-sm hover:bg-black/30 transition-colors"
              aria-label="More actions"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <MoreVertical size={18} />
            </button>
          )}
        </div>

        {/* Owner dropdown */}
        {menuOpen && isOwner && (
          <div className="absolute top-14 right-4 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20 w-44">
            <button
              onClick={() => { setMenuOpen(false); router.push(`/calendars/${id}/events/${eventId}/edit`); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Edit size={15} className="text-gray-500" />
              Edit event
            </button>
            <button
              onClick={() => { setMenuOpen(false); handleDelete(); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} />
              Delete event
            </button>
          </div>
        )}

        {/* Category chip */}
        {event.category_main && (
          <div className="mb-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
              {event.category_main}
            </span>
          </div>
        )}

        <h1 className="text-white font-bold text-2xl leading-tight">{event.title}</h1>
        <div className="flex items-center gap-2 mt-2">
          <img
            src={event.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(event.profiles?.full_name ?? 'U')}&background=ffffff&color=${eventColor.slice(1)}&size=32`}
            alt=""
            className="w-5 h-5 rounded-full ring-1 ring-white/30"
          />
          <span className="text-white/80 text-sm">by {event.profiles?.full_name}</span>
        </div>
      </div>

      {/* Close dropdown on outside click */}
      {menuOpen && (
        <button
          className="fixed inset-0 z-10"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        />
      )}

      <div className="flex-1 overflow-y-auto">
        {/* Event info card */}
        <div className="bg-white mx-4 -mt-4 rounded-2xl shadow-md p-4 space-y-3 mb-3">
          {/* Date/time */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: eventColor + '15' }}>
              <Clock size={16} style={{ color: eventColor }} />
            </div>
            <div>
              <div className="font-semibold text-gray-900 text-sm">
                {event.all_day ? 'All day' : format(new Date(event.start_at), 'h:mm a')}
                {event.end_at && !event.all_day && ` – ${format(new Date(event.end_at), 'h:mm a')}`}
              </div>
              <div className="text-sm text-gray-500 mt-0.5">{format(new Date(event.start_at), 'EEEE, MMMM d, yyyy')}</div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: eventColor + '15' }}>
                <MapPin size={16} style={{ color: eventColor }} />
              </div>
              <div className="font-medium text-gray-900 text-sm pt-1.5">{event.location}</div>
            </div>
          )}

          {/* Tags */}
          {eventTags.length > 0 && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: eventColor + '15' }}>
                <Tag size={16} style={{ color: eventColor }} />
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {eventTags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-200 text-gray-600 bg-gray-50"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Discoverability */}
          {isOwner && (
            <div className="flex items-start gap-3 border-t border-gray-50 pt-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: eventColor + '15' }}>
                <Share2 size={16} style={{ color: eventColor }} />
              </div>
              <div className="flex-1">
                <label className="flex items-start justify-between gap-3">
                  <span>
                    <span className="block text-sm font-semibold text-gray-900">Appear in Discover</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Public Discover listing only; calendar access stays unchanged.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!event.discoverable_by_others}
                    onChange={toggleDiscoverable}
                    disabled={savingDiscoverable}
                    className="mt-1 rounded"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-gray-600 text-sm leading-relaxed pt-1 border-t border-gray-50 mt-3">{event.description}</p>
          )}
        </div>

        {/* RSVP */}
        <div className="bg-white mx-4 rounded-2xl shadow-sm p-4 mb-3">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Are you going?</h3>
          <div className="flex gap-2">
            {RSVP_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = rsvp === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setRsvp(active ? null : opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 transition-all active:scale-95 ${
                    active ? opt.activeCls : 'border-gray-100 text-gray-500 hover:border-gray-200 bg-white'
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-semibold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white mx-4 rounded-2xl shadow-sm p-4 mb-28">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
            Comments {comments.length > 0 && <span className="text-gray-400 font-normal normal-case">({comments.length})</span>}
          </h3>

          {comments.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400">No comments yet.</p>
              <p className="text-xs text-gray-300 mt-1">Be the first to say something!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <img
                    src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.profiles?.full_name ?? 'U')}&size=32`}
                    alt=""
                    className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5 ring-2 ring-white"
                  />
                  <div>
                    <div className="bg-gray-50 rounded-2xl rounded-tl-sm px-3 py-2 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-800 mb-0.5">{c.profiles?.full_name}</p>
                      <p className="text-sm text-gray-700">{c.body}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5 ml-2">{format(new Date(c.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>
      </div>

      {/* Comment input — fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 px-4 py-3 flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendComment()}
          placeholder="Add a comment..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-shadow"
        />
        <button
          onClick={sendComment}
          disabled={!commentText.trim() || sending}
          className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white disabled:opacity-40 hover:bg-blue-600 transition-colors active:scale-95"
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  );
}
