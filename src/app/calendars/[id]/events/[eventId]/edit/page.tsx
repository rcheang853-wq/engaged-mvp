'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlignLeft, ArrowLeft, Clock, MapPin, Palette, Tag } from 'lucide-react';
import { PRIVATE_EVENT_TAXONOMY } from '@/lib/private-event-taxonomy';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

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
  viewer_can_edit?: boolean;
}

export default function EditEventPage() {
  const { id, eventId } = useParams<{ id: string; eventId: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<CalendarEvent | null>(null);
  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [showColors, setShowColors] = useState(false);
  const [categoryMain, setCategoryMain] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tagsForCategory = useMemo(() => {
    return PRIVATE_EVENT_TAXONOMY.find((entry) => entry.category === categoryMain)?.tags ?? [];
  }, [categoryMain]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(`/api/calendars/${id}/events/${eventId}`);
        const json = await res.json();

        if (cancelled) return;

        if (!json.success) {
          setEvent(null);
          setLoading(false);
          return;
        }

        const evt = json.data as CalendarEvent;
        const editable = !!evt.viewer_can_edit;
        setEvent(evt);
        setCanEdit(editable);

        const startDate = new Date(evt.start_at);
        const endDate = evt.end_at ? new Date(evt.end_at) : null;
        setTitle(evt.title || '');
        setDescription(evt.description || '');
        setDate(format(startDate, 'yyyy-MM-dd'));
        setStartTime(format(startDate, 'HH:mm'));
        setEndTime(endDate ? format(endDate, 'HH:mm') : '10:00');
        setAllDay(evt.all_day ?? false);
        setLocation(evt.location || '');
        setColor(evt.color || COLORS[0]);
        setCategoryMain(evt.category_main || '');
        setTags(evt.tags || []);
      } catch {
        if (!cancelled) setEvent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id, eventId]);

  const handleSave = async () => {
    if (!title.trim() || saving || !canEdit) return;

    setSaving(true);
    setError(null);

    try {
      const start_at = allDay ? `${date}T00:00:00.000Z` : `${date}T${startTime}:00.000Z`;
      const end_at = allDay ? null : `${date}T${endTime}:00.000Z`;

      const res = await fetch(`/api/calendars/${id}/events/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          start_at,
          end_at,
          all_day: allDay,
          location: location.trim() || null,
          color,
          category_main: categoryMain || null,
          tags,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'Failed to update event. Please try again.');
        return;
      }

      router.push(`/calendars/${id}/events/${eventId}`);
    } catch {
      setError('Failed to update event. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 h-5 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
          {[...Array(7)].map((_, index) => (
            <div key={index} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Event not found</h2>
        <p className="text-sm text-gray-500 mb-6">This event may not exist or you do not have permission to view it.</p>
        <button onClick={() => router.push(`/calendars/${id}`)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm">
          Go to Calendar
        </button>
      </div>
    );
  }

  if (canEdit === false) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
            <ArrowLeft size={20} />
          </button>
          <h1 className="flex-1 font-bold text-gray-900">Edit Event</h1>
        </div>
        <div className="px-4 py-4 max-w-2xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-900">
            <p className="font-semibold mb-1">View only</p>
            <p>Only calendar owners and editors can edit events in this shared calendar.</p>
          </div>
          <button onClick={() => router.push(`/calendars/${id}/events/${eventId}`)} className="mt-4 w-full py-2.5 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600">
            Back to Event
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.push(`/calendars/${id}/events/${eventId}`)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-bold text-gray-900">Edit Event</h1>
        <button onClick={handleSave} disabled={!title.trim() || saving} className="bg-blue-500 text-white px-4 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-600 transition-colors">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">{error}</div>}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowColors(!showColors)} className="w-10 h-10 rounded-xl flex-shrink-0 border-2 border-white shadow" style={{ backgroundColor: color }} aria-label="Pick color">
              <Palette size={16} className="text-white mx-auto" />
            </button>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Event title" className="flex-1 text-lg font-semibold outline-none placeholder-gray-300 text-gray-900" autoFocus />
          </div>

          {showColors && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {COLORS.map((nextColor) => (
                <button
                  key={nextColor}
                  onClick={() => {
                    setColor(nextColor);
                    setShowColors(false);
                  }}
                  className={`w-8 h-8 rounded-full transition-transform ${color === nextColor ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: nextColor }}
                  aria-label={`Use color ${nextColor}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-gray-400 flex-shrink-0" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-1 outline-none text-gray-900 text-sm" />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="rounded" />
              All day
            </label>
          </div>

          {!allDay && (
            <div className="flex items-center gap-3 pl-7">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="outline-none text-gray-900 text-sm bg-gray-50 px-3 py-1.5 rounded-lg" />
              <span className="text-gray-400 text-sm">to</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="outline-none text-gray-900 text-sm bg-gray-50 px-3 py-1.5 rounded-lg" />
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-gray-400 flex-shrink-0" />
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <Tag size={18} className="text-gray-400 flex-shrink-0" />
            <select
              value={categoryMain}
              onChange={(e) => {
                setCategoryMain(e.target.value);
                setTags([]);
              }}
              className="flex-1 outline-none text-gray-900 text-sm bg-transparent"
            >
              <option value="">Select main category</option>
              {PRIVATE_EVENT_TAXONOMY.map((entry) => (
                <option key={entry.category} value={entry.category}>
                  {entry.emoji ? `${entry.emoji} ` : ''}
                  {entry.category}
                </option>
              ))}
            </select>
          </div>

          <div className="pl-7">
            <div className="text-xs text-gray-500 mb-2">Tags</div>
            {categoryMain ? (
              <div className="flex flex-wrap gap-2">
                {tagsForCategory.map((tag) => {
                  const selected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]))}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${selected ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600'}`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-400">Pick a category to see available tags.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlignLeft size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add description" rows={3} className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400 resize-none" />
          </div>
        </div>
      </div>
    </div>
  );
}
