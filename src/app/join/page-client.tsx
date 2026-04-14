'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, ArrowLeft, Link as LinkIcon, Loader2, CheckCircle2 } from 'lucide-react';

type JoinPreview = {
  code: string;
  calendar: { id: string; name: string; color?: string | null };
  permission: string;
  state: 'open' | 'join' | 'view';
  requires_auth: boolean;
  already_member?: boolean;
};

function extractInviteCode(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';

  if (/^[a-zA-Z0-9]{4,64}$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  try {
    const url = new URL(trimmed);
    const code = url.searchParams.get('code');
    return (code || '').trim().toUpperCase();
  } catch {
    return '';
  }
}

export default function JoinPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<JoinPreview | null>(null);

  const loginHref = useMemo(() => {
    const encodedCode = encodeURIComponent(code.trim().toUpperCase());
    return `/auth/signin?redirectTo=${encodeURIComponent(`/join?code=${encodedCode}`)}`;
  }, [code]);

  const fetchPreview = async (nextCode: string) => {
    const normalized = extractInviteCode(nextCode);
    if (!normalized) {
      setPreview(null);
      setError('Please enter a valid invite code or link');
      return;
    }

    setLoadingPreview(true);
    setError('');

    try {
      const res = await fetch(`/api/calendars/join?code=${encodeURIComponent(normalized)}`);
      const d = await res.json();

      if (!d.success) {
        setPreview(null);
        setError(d.error || 'Invalid invite code');
        return;
      }

      setCode(normalized);
      setPreview(d.data as JoinPreview);
    } catch {
      setPreview(null);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    const fromQuery = searchParams.get('code');
    if (!fromQuery) return;

    const normalized = extractInviteCode(fromQuery);
    if (normalized) {
      setCode(normalized);
      void fetchPreview(normalized);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleJoin = async () => {
    if (!code.trim() || joining) return;

    const normalized = extractInviteCode(code);
    if (!normalized) {
      setError('Please enter a valid invite code or link');
      return;
    }

    setJoining(true);
    setError('');

    try {
      const res = await fetch('/api/calendars/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: normalized }),
      });

      const d = await res.json();
      if (d.success) {
        router.push(`/calendars/${d.data.calendar.id}`);
      } else if (res.status === 401) {
        router.push(loginHref);
      } else {
        setError(d.error || 'Unable to join calendar');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleOpenOrJoin = async () => {
    if (!preview) {
      await fetchPreview(code);
      return;
    }

    if (preview.state === 'open' && preview.requires_auth) {
      router.push(loginHref);
      return;
    }

    if (preview.state === 'view') {
      router.push(`/calendars/${preview.calendar.id}`);
      return;
    }

    await handleJoin();
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      <div className="sticky top-0 z-10 bg-[#F9FAFB] px-4 pt-12 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center hover:bg-[#F9FAFB] transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-[#111827]">Join a Calendar</h1>
            <p className="text-xs text-[#6B7280]">Open a share link, then join/view with the right permissions</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Users size={34} className="text-[#3B82F6]" />
        </div>

        <h2 className="text-lg font-bold text-[#111827] mb-2">Open calendar invite</h2>
        <p className="text-[#6B7280] text-sm text-center mb-8">
          Paste a whole-calendar share link or enter an invite code
        </p>

        <div className="w-full max-w-sm">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchPreview(code)}
            placeholder="ABC12345 or https://.../join?code=ABC12345"
            className="w-full text-center text-sm font-semibold bg-white border-2 border-[#E5E7EB] rounded-2xl px-4 py-4 outline-none focus:border-[#3B82F6] transition-colors placeholder:text-[#D1D5DB]"
          />

          {error && <p className="text-[#EF4444] text-sm text-center mt-2">{error}</p>}

          <button
            onClick={() => fetchPreview(code)}
            disabled={!code.trim() || loadingPreview}
            className="w-full mt-4 bg-white border border-[#D1D5DB] text-[#111827] py-3 rounded-2xl font-semibold text-sm disabled:opacity-40 hover:bg-[#F3F4F6] transition-colors"
          >
            {loadingPreview ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Checking...
              </span>
            ) : (
              'Open Invite'
            )}
          </button>

          {preview && (
            <div className="mt-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 space-y-2">
              <div className="flex items-center gap-2 text-[#111827] font-semibold">
                <CheckCircle2 size={16} className="text-emerald-600" />
                {preview.calendar.name}
              </div>
              <p className="text-xs text-[#6B7280]">
                Permission on join: <span className="font-semibold text-[#374151]">viewer</span>
              </p>
              <p className="text-xs text-[#6B7280]">
                {preview.state === 'open' && 'Sign in first to continue joining this calendar.'}
                {preview.state === 'join' && 'You can join this calendar now.'}
                {preview.state === 'view' && 'You are already a member. Open to view.'}
              </p>

              <button
                onClick={handleOpenOrJoin}
                disabled={joining}
                className="w-full mt-2 bg-[#3B82F6] text-white py-3 rounded-2xl font-semibold text-base disabled:opacity-40 hover:bg-[#2563EB] transition-colors"
              >
                {joining ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Working...
                  </span>
                ) : preview.state === 'open' ? (
                  'Sign in to Join'
                ) : preview.state === 'view' ? (
                  'View Calendar'
                ) : (
                  'Join Calendar'
                )}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[#6B7280] text-xs mt-6">
          <LinkIcon size={14} />
          Share-link and invite-code are both supported for whole-calendar access.
        </div>
      </div>
    </div>
  );
}
