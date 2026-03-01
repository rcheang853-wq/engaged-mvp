'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomTabBar from '@/components/BottomTabBar';

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

      const res = await fetch('/api/calendars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : undefined,
          color,
        }),
      });

      if (res.status === 401) {
        // Session expired / not signed in
        router.push('/auth/signin?redirectTo=/calendars/new');
        return;
      }

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        const msg = json?.error ? String(json.error) : 'Failed to create calendar';
        if (msg.toLowerCase().includes('row-level security')) {
          router.push('/auth/signin?redirectTo=/calendars/new');
          return;
        }
        throw new Error(msg);
      }

      const id = json.data?.id;
      if (!id) throw new Error('Calendar created but missing id');

      router.push(`/calendars/${id}`);
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
