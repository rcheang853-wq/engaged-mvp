'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomTabBar from '@/components/BottomTabBar';
import { supabase } from '@/lib/supabase/client';

const COLORS = [
  '#3B82F6',
  '#22C55E',
  '#F97316',
  '#EF4444',
  '#A855F7',
  '#14B8A6',
  '#64748B',
];

export default function NewCalendarPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => name.trim().length > 0 && !submitting, [name, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setError(null);

      // Client-side mutation (mobile-safe): uses browser session from localStorage
      // Avoid auth.getUser() here (network call) — on iOS it can be aborted unexpectedly.
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;

      if (!userId) {
        router.push('/auth/signin?redirectTo=/calendars/new');
        return;
      }

      const payload = {
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        color,
        created_by: userId,
        type: 'shared' as const,
      };

      // Direct PostgREST call with Authorization header (avoids env var issues)
      const supabaseUrl = 'https://hrwcwledehtkqlrzeqiq.supabase.co';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhyd2N3bGVkZWh0a3FscnplcWlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1MDY2MzEsImV4cCI6MjA4NzA4MjYzMX0.W3Q_UsbkLNbF6l-oK05hVHp9meHicj5glUU1DRm0BiA';

      const createCalendarOnce = async () => {
        const res = await fetch(`${supabaseUrl}/rest/v1/calendars`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey,
            'Authorization': `Bearer ${sessionData.session!.access_token}`,
            'Prefer': 'return=representation',
          },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const data = await res.json();
        return data[0];
      };

      let calendar;
      try {
        calendar = await createCalendarOnce();
      } catch (err: any) {
        const errMsg = String(err.message ?? err);
        if (errMsg.toLowerCase().includes('aborted')) {
          calendar = await createCalendarOnce();
        } else {
          throw err;
        }
      }

      if (!calendar || !calendar.id) throw new Error('Calendar created but missing id');

      // Insert membership via REST API
      const memRes = await fetch(`${supabaseUrl}/rest/v1/calendar_members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${sessionData.session!.access_token}`,
          'Prefer': 'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          calendar_id: calendar.id,
          user_id: userId,
          role: 'owner',
        }),
      });

      if (!memRes.ok) {
        const memErrText = await memRes.text();
        throw new Error(`Membership insert failed: ${memErrText}`);
      }

      router.push(`/calendars/${calendar.id}`);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create calendar');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={'min-h-screen bg-gray-50 pb-20'}>
      <div className={'bg-white border-b px-4 py-4 flex items-center justify-between'}>
        <div>
          <h1 className={'text-xl font-bold text-gray-900'}>New Calendar</h1>
          <p className={'text-xs text-gray-500 mt-1'}>Creates a shared calendar (TimeTree-style)</p>
        </div>
        <Link href={'/calendars'} className={'text-sm text-gray-600 hover:text-gray-900'}>
          Cancel
        </Link>
      </div>

      <form onSubmit={onSubmit} className={'px-4 py-5 max-w-md mx-auto space-y-4'}>
        {error && (
          <div className={'bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100'}>
            {error}
          </div>
        )}

        <div className={'bg-white rounded-2xl p-4 shadow-sm space-y-3'}>
          <div>
            <label className={'block text-xs font-semibold text-gray-600 mb-1'}>Calendar name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={'e.g. Family, Work, Project'}
              className={'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200'}
              autoFocus
            />
          </div>

          <div>
            <label className={'block text-xs font-semibold text-gray-600 mb-1'}>Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={'Short note for members'}
              className={'w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200'}
            />
          </div>

          <div>
            <label className={'block text-xs font-semibold text-gray-600 mb-2'}>Color</label>
            <div className={'flex flex-wrap gap-2'}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type={'button'}
                  onClick={() => setColor(c)}
                  className={
                    'w-9 h-9 rounded-full border flex items-center justify-center ' +
                    (color === c ? 'ring-2 ring-blue-300 border-blue-300' : 'border-gray-200')
                  }
                  aria-label={'Select color ' + c}
                >
                  <span className={'w-6 h-6 rounded-full'} style={{ backgroundColor: c }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type={'submit'}
          disabled={!canSubmit}
          className={
            'w-full rounded-xl py-3 text-sm font-semibold transition-colors ' +
            (canSubmit ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-500')
          }
        >
          {submitting ? 'Creating…' : 'Create shared calendar'}
        </button>

        <p className={'text-xs text-gray-500 text-center'}>
          Personal calendar is created automatically. Use shared calendars for family/team.
        </p>
      </form>

      <BottomTabBar />
    </div>
  );
}
