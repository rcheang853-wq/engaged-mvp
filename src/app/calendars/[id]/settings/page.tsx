'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Copy, Mail, RefreshCw, Users } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

type CalendarMember = {
  id?: string;
  user_id: string;
  role: string;
  profiles?: { full_name: string; email?: string; avatar_url: string | null };
};

type Calendar = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  invite_code: string | null;
  default_join_role: 'viewer' | 'editor';
  calendar_members?: CalendarMember[];
};

export default function CalendarSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const calendarId = Array.isArray(id) ? id[0] : id;

  const [calendar, setCalendar] = useState<Calendar | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'editor'>('viewer');
  const [inviting, setInviting] = useState(false);
  const [generatingShareLink, setGeneratingShareLink] = useState(false);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  const inviteLink = useMemo(() => {
    if (!calendar?.invite_code) return null;
    return `${window.location.origin}/join?code=${encodeURIComponent(calendar.invite_code)}`;
  }, [calendar?.invite_code]);

  const isOwner = calendar?.calendar_members?.some((member) => member.role === 'owner') ?? false;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/calendars/${calendarId}`);
        const json = await res.json();
        if (!cancelled && json.success) {
          const cal: Calendar = json.data;
          setCalendar(cal);
          setName(cal.name ?? '');
          setDescription(cal.description ?? '');
          setColor(cal.color ?? '#3B82F6');
          setInviteRole('viewer');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [calendarId]);

  const onSave = async () => {
    if (!calendarId || saving || !calendar) return;
    setSaving(true);
    setSaveMessage(null);

    try {
      const res = await fetch(`/api/calendars/${calendarId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          color,
          default_join_role: calendar.default_join_role,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCalendar((prev) => (prev ? { ...prev, ...json.data } : prev));
        setSaveMessage('Saved');
      } else {
        setSaveMessage(json.error || 'Failed to save');
      }
    } catch {
      setSaveMessage('Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 2000);
    }
  };

  const onCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setInviteMessage('Copied');
      setTimeout(() => setInviteMessage(null), 1500);
    } catch {
      setInviteMessage('Copy failed');
      setTimeout(() => setInviteMessage(null), 1500);
    }
  };

  const onInvite = async () => {
    const email = inviteEmail.trim();
    if (!email || inviting) return;

    setInviting(true);
    setInviteMessage(null);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: inviteRole }),
      });
      const json = await res.json();
      if (json.success) {
        setInviteEmail('');

        if (json.emailSent === false) {
          const fallbackHint = inviteLink
            ? ' Copy and share the calendar link below.'
            : ' Generate and copy a share link below as fallback.';
          setInviteMessage(`${json.message || 'Invite saved; email not sent.'}${fallbackHint}`);
        } else {
          setInviteMessage(json.message || 'Invite created and email sent');
        }
      } else {
        setInviteMessage(json.error || 'Invite failed');
      }
    } catch {
      setInviteMessage('Invite failed');
    } finally {
      setInviting(false);
      setTimeout(() => setInviteMessage(null), 2500);
    }
  };

  const onGenerateShareLink = async () => {
    if (!calendarId || generatingShareLink) return;

    setGeneratingShareLink(true);
    setInviteMessage(null);

    try {
      const res = await fetch(`/api/calendars/${calendarId}/share-link`, { method: 'POST' });
      const json = await res.json();

      if (!json.success) {
        setInviteMessage(json.error || 'Failed to generate share link');
        return;
      }

      const nextCode = json.data?.invite_code ?? null;
      setCalendar((prev) => (prev ? { ...prev, invite_code: nextCode } : prev));
      setInviteMessage(nextCode ? 'Share link ready' : 'Share link updated');
    } catch {
      setInviteMessage('Failed to generate share link');
    } finally {
      setGeneratingShareLink(false);
      setTimeout(() => setInviteMessage(null), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-gray-50 pb-20">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900">Calendar Settings</h1>
        </div>
        <div className="p-4 text-sm text-gray-500">Loading…</div>
        <BottomTabBar />
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="min-h-dvh bg-gray-50 pb-20">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
            <ArrowLeft size={20} />
          </button>
          <h1 className="font-bold text-gray-900">Calendar Settings</h1>
        </div>
        <div className="p-4 text-sm text-gray-500">Calendar not found.</div>
        <BottomTabBar />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-bold text-gray-900">Calendar Settings</h1>
        <button
          onClick={onSave}
          disabled={saving || !name.trim() || !isOwner}
          className="bg-blue-500 text-white px-4 py-1.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-blue-600 transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-w-2xl mx-auto">
        {saveMessage && (
          <div className="text-sm text-gray-700">{saveMessage}</div>
        )}

        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Details</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="w-full border rounded-xl px-3 py-2 text-sm"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isOwner}
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-10 w-12 border rounded"
              disabled={!isOwner}
            />
            <span className="text-xs text-gray-500">{color}</span>
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Members</h2>
          </div>
          <div className="space-y-2">
            {(calendar.calendar_members ?? []).map((m) => (
              <div key={m.user_id} className="flex items-center justify-between text-sm">
                <div className="text-gray-900">
                  {m.profiles?.full_name || m.profiles?.email || m.user_id}
                </div>
                <div className="text-xs text-gray-500">{m.role}</div>
              </div>
            ))}
            {(calendar.calendar_members ?? []).length === 0 && (
              <div className="text-sm text-gray-500">No members</div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          <h2 className="font-semibold text-gray-900">Invite / Share</h2>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Invite by email</label>
            <div className="flex gap-2">
              <input
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="friend@example.com"
                className="flex-1 border rounded-xl px-3 py-2 text-sm"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'editor')}
                className="border rounded-xl px-3 py-2 text-sm bg-white"
                aria-label="Invite role"
                disabled={!isOwner}
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
              <button
                onClick={onInvite}
                disabled={inviting || !inviteEmail.trim() || !isOwner}
                className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                <Mail size={16} />
                {inviting ? 'Sending…' : 'Invite'}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Email invite is optional. Share link is the primary whole-calendar sharing method; generate/copy it below anytime.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Default permission for share-link joins</label>
            <select
              value={calendar.default_join_role}
              onChange={(e) =>
                setCalendar((prev) =>
                  prev ? { ...prev, default_join_role: e.target.value as 'viewer' | 'editor' } : prev
                )
              }
              className="w-full border rounded-xl px-3 py-2 text-sm bg-white"
              disabled={!isOwner}
            >
              <option value="viewer">Viewer</option>
              <option value="editor">Editor</option>
            </select>
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              Anyone with the share link can join with this permission. Use Editor only if you trust anyone who receives the link.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-medium text-gray-700">Share link (whole calendar)</label>
              <button
                onClick={onGenerateShareLink}
                disabled={generatingShareLink || !isOwner}
                className="inline-flex items-center gap-2 border rounded-xl px-3 py-1.5 text-xs font-semibold disabled:opacity-40"
              >
                <RefreshCw size={14} className={generatingShareLink ? 'animate-spin' : ''} />
                {calendar.invite_code ? 'Regenerate' : 'Generate'}
              </button>
            </div>

            <label className="text-sm font-medium text-gray-700">Invite code</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={calendar.invite_code ?? ''}
                placeholder="Generate share link to create code"
                className="flex-1 border rounded-xl px-3 py-2 text-sm bg-gray-50"
              />
              {calendar.invite_code && (
                <button
                  onClick={() => onCopy(calendar.invite_code!)}
                  className="inline-flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-semibold"
                >
                  <Copy size={16} />
                  Copy
                </button>
              )}
            </div>

            {inviteLink && (
              <>
                <label className="text-sm font-medium text-gray-700">Share link</label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={inviteLink}
                    className="flex-1 border rounded-xl px-3 py-2 text-sm bg-gray-50"
                  />
                  <button
                    onClick={() => onCopy(inviteLink)}
                    className="inline-flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-semibold"
                  >
                    <Copy size={16} />
                    Copy
                  </button>
                </div>
              </>
            )}

            <p className="text-xs text-gray-500">
              Recipients opening this link can preview the calendar, then join as <span className="font-semibold">viewer</span>.
            </p>

            {!isOwner && (
              <p className="text-xs text-gray-500">
                Only the calendar owner can change sharing defaults or send invites.
              </p>
            )}

            {inviteMessage && <div className="text-sm text-gray-700">{inviteMessage}</div>}
          </div>
        </section>
      </div>

      <BottomTabBar />
    </div>
  );
}
