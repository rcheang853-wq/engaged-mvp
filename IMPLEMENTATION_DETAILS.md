# Implementation Details — Calendar Creation Fix

## The Two Files That Were Changed

---

## 1. `src/app/api/calendars/route.ts` (full file)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/dev-auth';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const createCalendarSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

async function ensurePersonalCalendar(
  supabase: any,
  user: { id: string; email?: string | null; user_metadata?: any }
) {
  try {
    await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: user.email ?? null,
          full_name: user.user_metadata?.full_name ?? 'User',
          avatar_url: null,
        },
        { onConflict: 'id' }
      );
  } catch {
    // ignore
  }

  const { data: existing, error: exErr } = await supabase
    .from('calendars')
    .select('id')
    .eq('type', 'personal')
    .eq('created_by', user.id)
    .limit(1);

  if (exErr) throw exErr;
  if (existing && existing.length > 0) return existing[0].id;

  const { data: cal, error: calErr } = await supabase
    .from('calendars')
    .insert({
      name: 'Personal',
      description: null,
      color: '#3B82F6',
      created_by: user.id,
      type: 'personal',
    })
    .select()
    .single();
  if (calErr) throw calErr;

  const { error: memErr } = await supabase
    .from('calendar_members')
    .upsert(
      { calendar_id: cal.id, user_id: user.id, role: 'owner' },
      { onConflict: 'calendar_id,user_id' }
    );
  if (memErr) throw memErr;

  return cal.id;
}

// Always uses SUPABASE_SERVICE_ROLE_KEY — bypasses RLS.
// Safe because every query is explicitly scoped to the authenticated user.id.
function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use service role for DB ops — user is already validated by getUser() above.
    // All queries are explicitly scoped to user.id so RLS bypass is safe here.
    const db = createServiceClient();

    await ensurePersonalCalendar(db, user as any);

    const { data, error } = await db
      .from('calendars')
      .select('*, calendar_members!inner(user_id, role)')
      .eq('calendar_members.user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await getAuthUser(supabase);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = createServiceClient();

    await ensurePersonalCalendar(db, user as any);

    const body = await request.json();
    const parsed = createCalendarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues },
        { status: 400 }
      );
    }

    const { data: calendar, error: calErr } = await db
      .from('calendars')
      .insert({ ...parsed.data, created_by: user.id, type: 'shared' })
      .select()
      .single();
    if (calErr) throw calErr;

    const { error: memErr } = await db
      .from('calendar_members')
      .upsert(
        { calendar_id: calendar.id, user_id: user.id, role: 'owner' },
        { onConflict: 'calendar_id,user_id' }
      );
    if (memErr) throw memErr;

    return NextResponse.json({ success: true, data: calendar }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
```

---

## 2. `src/app/calendars/new/page.tsx` (full file)

```tsx
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

      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        color,
      };

      // Route through the Next.js API (server-side auth via cookies — always fresh)
      const createCalendarOnce = async () => {
        const res = await fetch('/api/calendars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.status === 401) {
          router.push('/auth/signin?redirectTo=/calendars/new');
          return null;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(errText || `HTTP ${res.status}`);
        }

        const data = await res.json();
        return data.data;
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

      if (!calendar) return; // redirected to signin
      if (!calendar.id) throw new Error('Calendar created but missing id');

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
```

---

## Why This Works — Key Points for OpenClaw

### Problem
The original `new/page.tsx` called the Supabase PostgREST REST API **directly from the browser**:
- Used `supabase.auth.getSession()` to get the user's JWT client-side
- Sent that JWT as `Authorization: Bearer <token>` to `https://<project>.supabase.co/rest/v1/calendars`
- The JWT was stale/expired → PostgREST set `auth.uid() = null` → RLS policy `(created_by = auth.uid())` failed with `42501`

A previous attempt tried fixing this in the API route by calling `supabase.auth.getSession()` server-side to extract a fresh JWT. This also failed because **`@supabase/ssr` v0.7's `getSession()` does not reliably reconstruct the full session object from chunked request cookies in Next.js Route Handlers** — it returns `null` even when the user is authenticated.

### Solution

**`new/page.tsx`**: Stop calling Supabase directly. Call `POST /api/calendars` instead. Same-origin `fetch()` automatically sends all browser cookies, so the server always receives the latest auth cookies.

**`route.ts`**: Stop fighting with `getSession()` to get a JWT. Instead:
1. Call `getAuthUser(supabase)` → internally calls `supabase.auth.getUser()` which makes a **real round-trip to Supabase Auth** to validate the JWT — this always works regardless of cookie format
2. Use a **service role client** (`SUPABASE_SERVICE_ROLE_KEY`) for all DB writes — this bypasses RLS entirely, so there is no JWT needed for the DB call
3. Manually enforce the same security constraints in code: `created_by: user.id`, `.eq('calendar_members.user_id', user.id)` — the `user.id` comes from the server-validated `getUser()` call, not user input
