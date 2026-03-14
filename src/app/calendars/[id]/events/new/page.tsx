'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, AlignLeft, Palette, Link as LinkIcon, Bell, Repeat, Paperclip, Tag } from 'lucide-react';
import { PRIVATE_EVENT_TAXONOMY } from '@/lib/private-event-taxonomy';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function NewEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [url, setUrl] = useState('');
  const [reminderMinutes, setReminderMinutes] = useState<number | null>(null);

  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [categoryMain, setCategoryMain] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const [canEdit, setCanEdit] = useState<boolean | null>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const isReadOnly = canEdit === false;

  const tagsForCategory = useMemo(() => {
    return PRIVATE_EVENT_TAXONOMY.find(entry => entry.category === categoryMain)?.tags ?? [];
  }, [categoryMain]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, calRes] = await Promise.all([fetch('/api/auth/me'), fetch(`/api/calendars/${id}`)]);
        const meJson = await meRes.json();
        const calJson = await calRes.json();

        const userId = meJson?.user?.id as string | undefined;
        const members = calJson?.data?.calendar_members as any[] | undefined;
        const role = members?.find((m) => m.user_id === userId)?.role as string | undefined;
        const isOwner = role === 'owner';

        if (!cancelled) setCanEdit(isOwner);
      } catch {
        if (!cancelled) setCanEdit(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    if (canEdit === false) {
      setPermissionError('Only calendar owners can create events in shared calendars.');
      return;
    }

    setSaving(true);
    setPermissionError(null);

    try {
      const start_at = allDay ? `${date}T00:00:00.000Z` : `${date}T${startTime}:00.000Z`;
      const end_at = allDay ? null : `${date}T${endTime}:00.000Z`;

      const res = await fetch(`/api/calendars/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          notes: notes.trim() || undefined,
          url: url.trim() || undefined,
          reminder_minutes: reminderMinutes ?? undefined,
          start_at,
          end_at,
          all_day: allDay,
          location: location.trim() || undefined,
          color,
          category_main: categoryMain || undefined,
          tags,
        }),
      });

      const d = await res.json();
      if (!res.ok || !d.success) {
        // Supabase RLS will block viewers; surface a friendly message
        if (res.status === 401 || res.status === 403) {
          setPermissionError('Only calendar owners can create events in shared calendars.');
        } else {
          setPermissionError('Failed to create event. Please try again.');
        }
        return;
      }

      router.push(`/calendars/${id}/events/${d.data.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-bold text-gray-900">New Event</h1>
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving || canEdit === false}
          className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {canEdit === false ? 'View only' : saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {permissionError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-800">
            {permissionError}
          </div>
        )}

        {canEdit === false && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm text-yellow-900">
            This calendar is shared with you as <span className="font-semibold">viewer-only</span>. You can view events but can’t create or edit them.
          </div>
        )}
        {/* Title + color */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (isReadOnly) return;
                setShowColors(!showColors);
              }}
              disabled={isReadOnly}
              className="w-10 h-10 rounded-xl flex-shrink-0 border-2 border-white shadow"
              style={{ backgroundColor: color }}
            >
              <Palette size={16} className="text-white mx-auto" />
            </button>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Event title"
              disabled={isReadOnly}
              className="flex-1 text-lg font-semibold outline-none placeholder-gray-300 text-gray-900 disabled:text-gray-400"
              autoFocus
            />
          </div>

          {/* Color picker */}
          {showColors && (
            <div className="flex gap-2 mt-3 pl-13 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => {
                    if (isReadOnly) return;
                    setColor(c);
                    setShowColors(false);
                  }}
                  disabled={isReadOnly}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'} disabled:opacity-60 disabled:hover:scale-100`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              disabled={isReadOnly}
              className="flex-1 outline-none text-gray-900 text-sm disabled:text-gray-400"
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
                disabled={isReadOnly}
                className="rounded"
              />
              All day
            </label>
          </div>

          {!allDay && (
            <div className="flex items-center gap-3 pl-7">
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                disabled={isReadOnly}
                className="outline-none text-gray-900 text-sm bg-gray-50 px-3 py-1.5 rounded-lg disabled:text-gray-400"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                disabled={isReadOnly}
                className="outline-none text-gray-900 text-sm bg-gray-50 px-3 py-1.5 rounded-lg disabled:text-gray-400"
              />
            </div>
          )}
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <MapPin size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Add location"
              disabled={isReadOnly}
              className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Category + tags */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <Tag size={18} className="text-gray-400 flex-shrink-0" />
            <select
              value={categoryMain}
              onChange={(e) => {
                const nextCategory = e.target.value;
                setCategoryMain(nextCategory);
                setTags([]);
              }}
              disabled={isReadOnly}
              className="flex-1 outline-none text-gray-900 text-sm bg-transparent disabled:text-gray-400"
            >
              <option value="">Select main category</option>
              {PRIVATE_EVENT_TAXONOMY.map((entry) => (
                <option key={entry.category} value={entry.category}>
                  {entry.emoji ? `${entry.emoji} ` : ''}{entry.category}
                </option>
              ))}
            </select>
          </div>

          <div className="pl-7">
            <div className="text-xs text-gray-500 mb-2">Tags (optional)</div>
            {categoryMain ? (
              <>
                {(() => {
                  const entry = PRIVATE_EVENT_TAXONOMY.find((e) => e.category === categoryMain);
                  if (!entry) return null;

                  // If tagGroups exist, show grouped layout
                  if (entry.tagGroups && entry.tagGroups.length > 0) {
                    return (
                      <div className="space-y-3">
                        {entry.tagGroups.map((group) => (
                          <div key={group.label}>
                            <div className="text-xs font-medium text-gray-600 mb-1.5">{group.label}</div>
                            <div className="flex flex-wrap gap-2">
                              {group.tags.map((tag) => {
                                const selected = tags.includes(tag);
                                return (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      if (isReadOnly) return;
                                      setTags((prev) =>
                                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                                      );
                                    }}
                                    disabled={isReadOnly}
                                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                                      selected
                                        ? 'bg-blue-50 border-blue-200 text-blue-700'
                                        : 'bg-white border-gray-200 text-gray-600'
                                    } disabled:opacity-60`}
                                  >
                                    {tag}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // Otherwise, show flat list (fallback for categories without tagGroups)
                  return (
                    <div className="flex flex-wrap gap-2">
                      {tagsForCategory.map((tag) => {
                        const selected = tags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              if (isReadOnly) return;
                              setTags((prev) =>
                                prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                              );
                            }}
                            disabled={isReadOnly}
                            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                              selected
                                ? 'bg-blue-50 border-blue-200 text-blue-700'
                                : 'bg-white border-gray-200 text-gray-600'
                            } disabled:opacity-60`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            ) : (
              <p className="text-xs text-gray-400">Pick a category to see available tags.</p>
            )}
          </div>
        </div>

        {/* URL */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <LinkIcon size={18} className="text-gray-400 flex-shrink-0" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Add URL"
              disabled={isReadOnly}
              className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Reminder */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Bell size={18} className="text-gray-400 flex-shrink-0" />
            <select
              value={reminderMinutes == null ? '' : String(reminderMinutes)}
              onChange={(e) => setReminderMinutes(e.target.value ? Number(e.target.value) : null)}
              disabled={isReadOnly}
              className="flex-1 outline-none text-gray-900 text-sm bg-transparent disabled:text-gray-400"
            >
              <option value="">No reminder</option>
              <option value="5">5 minutes before</option>
              <option value="10">10 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="60">1 hour before</option>
              <option value="1440">1 day before</option>
            </select>
          </div>
        </div>

        {/* Repeat (UI-only) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm opacity-70">
          <div className="flex items-center gap-3">
            <Repeat size={18} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700">Repeat</span>
            <span className="ml-auto text-xs text-gray-500">Coming soon</span>
          </div>
        </div>

        {/* Attachments (UI-only) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm opacity-70">
          <div className="flex items-center gap-3">
            <Paperclip size={18} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-700">Attachments</span>
            <span className="ml-auto text-xs text-gray-500">Coming soon</span>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlignLeft size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add description"
              rows={3}
              disabled={isReadOnly}
              className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400 resize-none disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlignLeft size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes"
              rows={4}
              disabled={isReadOnly}
              className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400 resize-none disabled:text-gray-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
