'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, Send, MoreVertical, Check, X, HelpCircle } from 'lucide-react';

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
  created_by: string;
  profiles: { id: string; full_name: string; avatar_url: string | null };
  event_comments: Comment[];
}

const RSVP_OPTIONS = [
  { value: 'going', label: 'Going', icon: Check, color: 'bg-green-500' },
  { value: 'maybe', label: 'Maybe', icon: HelpCircle, color: 'bg-yellow-500' },
  { value: 'not_going', label: "Can't go", icon: X, color: 'bg-red-400' },
];

export default function EventDetailPage() {
  const { id, eventId } = useParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [rsvp, setRsvp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" /></div>;
  if (!event) return <div className="min-h-screen flex items-center justify-center text-gray-500">Event not found</div>;

  const eventColor = event.color || '#3B82F6';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Hero header */}
      <div className="relative px-4 pt-12 pb-6" style={{ backgroundColor: eventColor }}>
        <button onClick={() => router.back()} className="absolute top-4 left-4 text-white/80 hover:text-white">
          <ArrowLeft size={22} />
        </button>
        <button className="absolute top-4 right-4 text-white/80 hover:text-white">
          <MoreVertical size={22} />
        </button>
        <h1 className="text-white font-bold text-2xl mt-2">{event.title}</h1>
        <div className="flex items-center gap-1 mt-1 text-white/80 text-sm">
          <img
            src={event.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${event.profiles?.full_name}&background=ffffff&color=${eventColor.slice(1)}&size=32`}
            alt=""
            className="w-5 h-5 rounded-full"
          />
          <span>by {event.profiles?.full_name}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Event info */}
        <div className="bg-white mx-4 -mt-4 rounded-2xl shadow-sm p-4 space-y-3 mb-3">
          {/* Date/time */}
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: eventColor + '20' }}>
              <Clock size={16} style={{ color: eventColor }} />
            </div>
            <div>
              <div className="font-medium text-gray-900">
                {event.all_day ? 'All day' : format(new Date(event.start_at), 'h:mm a')}
                {event.end_at && !event.all_day && ` – ${format(new Date(event.end_at), 'h:mm a')}`}
              </div>
              <div className="text-sm text-gray-500">{format(new Date(event.start_at), 'EEEE, MMMM d, yyyy')}</div>
            </div>
          </div>

          {/* Location */}
          {event.location && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: eventColor + '20' }}>
                <MapPin size={16} style={{ color: eventColor }} />
              </div>
              <div className="font-medium text-gray-900 pt-1">{event.location}</div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <p className="text-gray-600 text-sm leading-relaxed pt-1">{event.description}</p>
          )}
        </div>

        {/* RSVP */}
        <div className="bg-white mx-4 rounded-2xl shadow-sm p-4 mb-3">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Are you going?</h3>
          <div className="flex gap-2">
            {RSVP_OPTIONS.map(opt => {
              const Icon = opt.icon;
              const active = rsvp === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setRsvp(active ? null : opt.value)}
                  className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${active ? `${opt.color} border-transparent text-white` : 'border-gray-100 text-gray-600 hover:border-gray-200'}`}
                >
                  <Icon size={18} />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Comments */}
        <div className="bg-white mx-4 rounded-2xl shadow-sm p-4 mb-24">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Comments {comments.length > 0 && <span className="text-gray-400 font-normal">({comments.length})</span>}
          </h3>

          {comments.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No comments yet. Say something!</p>
          ) : (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <img
                    src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=${c.profiles?.full_name}&size=32`}
                    alt=""
                    className="w-7 h-7 rounded-full flex-shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-3 py-2">
                      <p className="text-xs font-semibold text-gray-700 mb-0.5">{c.profiles?.full_name}</p>
                      <p className="text-sm text-gray-800">{c.body}</p>
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
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t px-4 py-3 flex gap-2">
        <input
          type="text"
          value={commentText}
          onChange={e => setCommentText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendComment()}
          placeholder="Add a comment..."
          className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
        />
        <button
          onClick={sendComment}
          disabled={!commentText.trim() || sending}
          className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
