'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users, ArrowLeft, Link as LinkIcon } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-bold text-gray-900">Join a Calendar</h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 -mt-16">
        {/* Icon */}
        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
          <Users size={36} className="text-blue-400" />
        </div>

        <h2 className="text-xl font-bold text-gray-900 mb-2">Enter invite code</h2>
        <p className="text-gray-500 text-sm text-center mb-8">
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
            className="w-full text-center text-2xl font-mono font-bold tracking-widest bg-white border-2 border-gray-200 rounded-2xl px-4 py-4 outline-none focus:border-blue-400 transition-colors placeholder-gray-200"
          />

          {error && (
            <p className="text-red-500 text-sm text-center mt-2">{error}</p>
          )}

          <button
            onClick={handleJoin}
            disabled={!code.trim() || joining}
            className="w-full mt-4 bg-blue-500 text-white py-3.5 rounded-2xl font-semibold text-base disabled:opacity-40 hover:bg-blue-600 transition-colors"
          >
            {joining ? 'Joining...' : 'Join Calendar'}
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 w-full max-w-sm mt-6 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Paste link */}
        <button className="flex items-center gap-2 text-blue-500 text-sm font-medium">
          <LinkIcon size={16} />
          Paste invite link
        </button>
      </div>
    </div>
  );
}
