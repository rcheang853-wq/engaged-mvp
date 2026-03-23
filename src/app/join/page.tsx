'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, Link as LinkIcon, Loader2 } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  const handleJoin = async () => {
    if (!code.trim() || joining) return;
    setJoining(true);
    setError('');
    try {
      const res = await fetch('/api/calendars/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      });
      const d = await res.json();
      if (d.success) {
        router.push(`/calendars/${d.data.calendar.id}`);
      } else {
        setError(d.error || 'Invalid invite code');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Header */}
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
            <p className="text-xs text-[#6B7280]">Enter an invite code or paste a link</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Users size={34} className="text-[#3B82F6]" />
        </div>

        <h2 className="text-lg font-bold text-[#111827] mb-2">Enter invite code</h2>
        <p className="text-[#6B7280] text-sm text-center mb-8">
          Ask the calendar owner to share their invite code or link with you
        </p>

        {/* Code input */}
        <div className="w-full max-w-sm">
          <input
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="e.g. ABC12345"
            maxLength={8}
            className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-white border-2 border-[#E5E7EB] rounded-2xl px-4 py-4 outline-none focus:border-[#3B82F6] transition-colors placeholder:text-[#D1D5DB]"
          />

          {error && (
            <p className="text-[#EF4444] text-sm text-center mt-2">{error}</p>
          )}

          <button
            onClick={handleJoin}
            disabled={!code.trim() || joining}
            className="w-full mt-4 bg-[#3B82F6] text-white py-3.5 rounded-2xl font-semibold text-base disabled:opacity-40 hover:bg-[#2563EB] transition-colors"
          >
            {joining ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Joining...
              </span>
            ) : (
              'Join Calendar'
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm mt-6 mb-6">
          <div className="flex-1 h-px bg-[#E5E7EB]" />
          <span className="text-sm text-[#9CA3AF]">or</span>
          <div className="flex-1 h-px bg-[#E5E7EB]" />
        </div>

        {/* Paste link */}
        <button className="flex items-center gap-2 text-[#3B82F6] text-sm font-semibold hover:text-[#2563EB] transition-colors">
          <LinkIcon size={16} />
          Paste invite link
        </button>
      </div>
    </div>
  );
}
