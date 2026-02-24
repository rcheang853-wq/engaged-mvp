'use client';

import { useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Clock, AlignLeft, Palette } from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function NewEventPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [showColors, setShowColors] = useState(false);

  const handleSave = async () => {
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const start_at = allDay ? `${date}T00:00:00.000Z` : `${date}T${startTime}:00.000Z`;
      const end_at = allDay ? null : `${date}T${endTime}:00.000Z`;

      const res = await fetch(`/api/calendars/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim() || undefined, start_at, end_at, all_day: allDay, location: location.trim() || undefined, color }),
      });
      const d = await res.json();
      if (d.success) {
        router.push(`/calendars/${id}/events/${d.data.id}`);
      }
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
          disabled={!title.trim() || saving}
          className="bg-blue-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-4 space-y-3 max-w-2xl mx-auto">
        {/* Title + color */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowColors(!showColors)}
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
              className="flex-1 text-lg font-semibold outline-none placeholder-gray-300 text-gray-900"
              autoFocus
            />
          </div>

          {/* Color picker */}
          {showColors && (
            <div className="flex gap-2 mt-3 pl-13 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setShowColors(false); }}
                  className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
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
              className="flex-1 outline-none text-gray-900 text-sm"
            />
            <label className="flex items-center gap-1.5 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
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
                className="outline-none text-gray-900 text-sm bg-gray-50 px-3 py-1.5 rounded-lg"
              />
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="outline-none text-gray-900 text-sm bg-gray-50 px-3 py-1.5 rounded-lg"
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
              className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400"
            />
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <AlignLeft size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add description or notes"
              rows={4}
              className="flex-1 outline-none text-gray-900 text-sm placeholder-gray-400 resize-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
