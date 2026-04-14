'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowLeft, MapPin, Bell, Repeat, Tag, Link as LinkIcon } from 'lucide-react';
import { PRIVATE_EVENT_TAXONOMY } from '@/lib/private-event-taxonomy';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const sectionLabel: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--engaged-text2)',
  marginBottom: 8,
};

const formInput: React.CSSProperties = {
  width: '100%',
  border: '1.5px solid var(--engaged-border)',
  borderRadius: 14,
  padding: '14px 16px',
  fontSize: 16,
  fontFamily: 'inherit',
  background: '#fff',
  color: 'var(--engaged-text)',
  outline: 'none',
};

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
  const [discoverableByOthers, setDiscoverableByOthers] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [categoryMain, setCategoryMain] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const [canEdit, setCanEdit] = useState<boolean | null>(null);
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
        const cal = calJson?.data as any;
        const members = cal?.calendar_members as any[] | undefined;
        const role = members?.find((m) => m.user_id === userId)?.role as string | undefined;
        const ownerId = (cal?.owner_id ?? cal?.created_by ?? cal?.user_id) as string | undefined;
        const isOwner = role === 'owner' || (!!userId && !!ownerId && userId === ownerId);

        if (!cancelled) setCanEdit(isOwner);
      } catch {
        if (!cancelled) setCanEdit(null);
      }
    })();
    return () => { cancelled = true; };
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
      const start_at = allDay
        ? `${date}T00:00:00.000Z`
        : `${date}T${startTime}:00.000Z`;
      const end_at = allDay ? undefined : `${date}T${endTime}:00.000Z`;

      const payload: any = {
        title: title.trim(),
        description: description.trim() || undefined,
        notes: notes.trim() || undefined,
        url: url.trim() || undefined,
        reminder_minutes: reminderMinutes ?? undefined,
        start_at,
        all_day: allDay,
        location: location.trim() || undefined,
        discoverable_by_others: discoverableByOthers,
        color,
        category_main: categoryMain || undefined,
        tags,
      };
      if (!allDay) payload.end_at = end_at;

      const res = await fetch(`/api/calendars/${id}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const d = await res.json();
      if (!res.ok || !d.success) {
        if (res.status === 401 || res.status === 403) {
          setPermissionError('Only calendar owners can create events in shared calendars.');
        } else {
          setPermissionError('Failed to create event. Please try again.');
        }
        return;
      }

      router.push(`/calendars/${id}?date=${encodeURIComponent(date)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--engaged-bg)', paddingBottom: 40 }}>
      {/* ── Header ── */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1.5px solid var(--engaged-border)',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '1.5px solid var(--engaged-border)',
            background: 'var(--engaged-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <ArrowLeft size={18} style={{ color: 'var(--engaged-text2)' }} />
        </button>
        <h1
          style={{
            flex: 1,
            fontSize: 20, fontWeight: 900, letterSpacing: '-0.04em',
            color: 'var(--engaged-text)',
          }}
        >
          New Event
        </h1>
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving || canEdit === false}
          style={{
            height: 36, padding: '0 18px', borderRadius: 18,
            background: (!title.trim() || saving || canEdit === false) ? '#ccc' : 'var(--engaged-blue)',
            color: '#fff', fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', flexShrink: 0,
          }}
        >
          {canEdit === false ? 'View only' : saving ? 'Saving\u2026' : 'Save'}
        </button>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        {permissionError && (
          <div style={{ margin: '16px 20px 0', padding: '12px 14px', background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 14, fontSize: 13, color: '#B91C1C' }}>
            {permissionError}
          </div>
        )}

        {canEdit === false && (
          <div style={{ margin: '12px 20px 0', padding: '12px 14px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, fontSize: 13, color: '#92400E' }}>
            This calendar is shared with you as <strong>viewer-only</strong>. You can view events but can&apos;t create or edit them.
          </div>
        )}

        {/* ── Title ── */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={sectionLabel}>Event Title</div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What's happening?"
            disabled={isReadOnly}
            autoFocus
            style={{ ...formInput, fontSize: 18, fontWeight: 700 }}
          />
        </div>

        {/* ── Color picker ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Color</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: '4px 0' }}>
            {COLORS.map(c => (
              <button
                key={c}
                onClick={() => { if (!isReadOnly) setColor(c); }}
                disabled={isReadOnly}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: c, border: color === c ? '3px solid var(--engaged-text)' : '3px solid transparent',
                  transform: color === c ? 'scale(1.1)' : 'scale(1)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {color === c && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Date & Time ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Date &amp; Time</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div
              style={{
                border: '1.5px solid var(--engaged-border)', borderRadius: 14,
                padding: '12px 14px', background: '#fff', cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--engaged-text3)', marginBottom: 3 }}>Date</div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                disabled={isReadOnly}
                style={{ fontSize: 15, fontWeight: 700, color: 'var(--engaged-text)', border: 'none', outline: 'none', background: 'transparent', width: '100%', cursor: 'pointer' }}
              />
            </div>
            <div
              style={{
                border: '1.5px solid var(--engaged-border)', borderRadius: 14,
                padding: '12px 14px', background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--engaged-text3)', marginBottom: 3 }}>All day</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: allDay ? 'var(--engaged-blue)' : 'var(--engaged-text)' }}>{allDay ? 'Yes' : 'No'}</div>
              </div>
              <input
                type="checkbox"
                checked={allDay}
                onChange={e => setAllDay(e.target.checked)}
                disabled={isReadOnly}
                style={{ width: 20, height: 20, cursor: 'pointer', accentColor: 'var(--engaged-blue)' }}
              />
            </div>
          </div>

          {!allDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ border: '1.5px solid var(--engaged-border)', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--engaged-text3)', marginBottom: 3 }}>Start</div>
                <input
                  type="time"
                  value={startTime}
                  onChange={e => setStartTime(e.target.value)}
                  disabled={isReadOnly}
                  style={{ fontSize: 15, fontWeight: 700, color: 'var(--engaged-text)', border: 'none', outline: 'none', background: 'transparent', width: '100%', cursor: 'pointer' }}
                />
              </div>
              <div style={{ border: '1.5px solid var(--engaged-border)', borderRadius: 14, padding: '12px 14px', background: '#fff' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--engaged-text3)', marginBottom: 3 }}>End</div>
                <input
                  type="time"
                  value={endTime}
                  onChange={e => setEndTime(e.target.value)}
                  disabled={isReadOnly}
                  style={{ fontSize: 15, fontWeight: 700, color: 'var(--engaged-text)', border: 'none', outline: 'none', background: 'transparent', width: '100%', cursor: 'pointer' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* ── Location ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Location</div>
          <div style={{ position: 'relative' }}>
            <MapPin
              size={16}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--engaged-text3)', pointerEvents: 'none' }}
            />
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Add a location"
              disabled={isReadOnly}
              style={{ ...formInput, paddingLeft: 40 }}
            />
          </div>
        </div>

        {/* ── Discover ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <label
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 12,
              border: '1.5px solid var(--engaged-border)', borderRadius: 14,
              padding: '14px 16px', background: '#fff', cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={discoverableByOthers}
              onChange={(e) => setDiscoverableByOthers(e.target.checked)}
              disabled={isReadOnly}
              style={{ marginTop: 2, width: 18, height: 18, accentColor: 'var(--engaged-blue)' }}
            />
            <span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--engaged-text)' }}>Appear in Discover</span>
              <span style={{ display: 'block', fontSize: 12, color: 'var(--engaged-text2)', marginTop: 2 }}>
                Anyone can find this event in Discover. This does not invite them to this calendar.
              </span>
            </span>
          </label>
        </div>

        {/* ── Category + Tags ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Category</div>
          <select
            value={categoryMain}
            onChange={(e) => { setCategoryMain(e.target.value); setTags([]); }}
            disabled={isReadOnly}
            style={{ ...formInput, cursor: 'pointer' }}
          >
            <option value="">Select a category</option>
            {PRIVATE_EVENT_TAXONOMY.map((entry) => (
              <option key={entry.category} value={entry.category}>
                {entry.emoji ? `${entry.emoji} ` : ''}{entry.category}
              </option>
            ))}
          </select>

          {categoryMain && (
            <div style={{ marginTop: 12 }}>
              <div style={{ ...sectionLabel, marginBottom: 8 }}>Tags</div>
              {(() => {
                const entry = PRIVATE_EVENT_TAXONOMY.find((e) => e.category === categoryMain);
                if (!entry) return null;
                if (entry.tagGroups && entry.tagGroups.length > 0) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {entry.tagGroups.map((group) => (
                        <div key={group.label}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--engaged-text2)', marginBottom: 6 }}>{group.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {group.tags.map((tag) => {
                              const selected = tags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => { if (!isReadOnly) setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]); }}
                                  disabled={isReadOnly}
                                  style={{
                                    padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                                    border: selected ? '1.5px solid var(--engaged-blue)' : '1.5px solid var(--engaged-border)',
                                    background: selected ? 'var(--engaged-blue-lt)' : '#fff',
                                    color: selected ? 'var(--engaged-blue)' : 'var(--engaged-text2)',
                                    cursor: 'pointer', transition: 'all 0.15s',
                                  }}
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
                return (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {tagsForCategory.map((tag) => {
                      const selected = tags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => { if (!isReadOnly) setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]); }}
                          disabled={isReadOnly}
                          style={{
                            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            border: selected ? '1.5px solid var(--engaged-blue)' : '1.5px solid var(--engaged-border)',
                            background: selected ? 'var(--engaged-blue-lt)' : '#fff',
                            color: selected ? 'var(--engaged-blue)' : 'var(--engaged-text2)',
                            cursor: 'pointer', transition: 'all 0.15s',
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Reminder ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Reminder</div>
          <select
            value={reminderMinutes == null ? '' : String(reminderMinutes)}
            onChange={(e) => setReminderMinutes(e.target.value ? Number(e.target.value) : null)}
            disabled={isReadOnly}
            style={{ ...formInput, cursor: 'pointer' }}
          >
            <option value="">No reminder</option>
            <option value="5">5 minutes before</option>
            <option value="10">10 minutes before</option>
            <option value="30">30 minutes before</option>
            <option value="60">1 hour before</option>
            <option value="1440">1 day before</option>
          </select>
        </div>

        {/* ── URL ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Event URL</div>
          <div style={{ position: 'relative' }}>
            <LinkIcon
              size={16}
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--engaged-text3)', pointerEvents: 'none' }}
            />
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="Add a link (RSVP, tickets, etc.)"
              disabled={isReadOnly}
              style={{ ...formInput, paddingLeft: 40 }}
            />
          </div>
        </div>

        {/* ── Repeat (UI only) ── */}
        <div style={{ padding: '16px 20px 0', opacity: 0.5 }}>
          <div style={{ ...formInput, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Repeat size={16} style={{ color: 'var(--engaged-text3)' }} />
            <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--engaged-text)' }}>Repeat</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--engaged-text3)' }}>Coming soon</span>
          </div>
        </div>

        {/* ── Description ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Description</div>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Add a description"
            rows={3}
            disabled={isReadOnly}
            style={{ ...formInput, resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* ── Notes ── */}
        <div style={{ padding: '16px 20px 0' }}>
          <div style={sectionLabel}>Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes"
            rows={4}
            disabled={isReadOnly}
            style={{ ...formInput, resize: 'none', lineHeight: 1.5 }}
          />
        </div>

        {/* ── Save button (bottom) ── */}
        <div style={{ padding: '24px 20px 40px' }}>
          <button
            onClick={handleSave}
            disabled={!title.trim() || saving || canEdit === false}
            style={{
              width: '100%', height: 52, borderRadius: 16,
              background: (!title.trim() || saving || canEdit === false) ? '#D1D5DB' : 'var(--engaged-blue)',
              color: '#fff', fontSize: 16, fontWeight: 800,
              letterSpacing: '-0.02em', border: 'none', cursor: 'pointer',
              transition: 'opacity 0.15s',
            }}
          >
            {canEdit === false ? 'View only' : saving ? 'Saving\u2026' : 'Add Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
