'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

interface CalendarInvite {
  id: string;
  calendar_id: string;
  invited_email: string;
  created_at: string;
  expires_at: string;
  calendars: { id: string; name: string; color: string | null } | null;
}

export default function InvitesPage() {
  const router = useRouter();
  const [invites, setInvites] = useState<CalendarInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function fetchInvites() {
    try {
      const res = await fetch('/api/me/invites');
      const json = await res.json();
      if (json.success) {
        setInvites(json.data ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchInvites();
  }, []);

  async function handleAccept(inviteId: string) {
    setActioningId(inviteId);
    setMessage(null);
    try {
      const res = await fetch(`/api/invites/${inviteId}/accept`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Invite accepted! You can now view this calendar.' });
        await fetchInvites();
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to accept invite' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActioningId(null);
    }
  }

  async function handleDecline(inviteId: string) {
    setActioningId(inviteId);
    setMessage(null);
    try {
      const res = await fetch(`/api/invites/${inviteId}/decline`, { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Invite declined.' });
        await fetchInvites();
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to decline invite' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3" style={{ paddingTop: 40 }}>
        <button onClick={() => router.back()} className="text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <h1 className="flex-1 font-bold text-gray-900">Invites</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {message && (
          <div
            className={`rounded-xl p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && invites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">📬</span>
            <h3 className="text-base font-semibold text-gray-900 mb-1">No pending invites</h3>
            <p className="text-sm text-gray-600">Calendar invites will appear here</p>
          </div>
        )}

        {!loading && invites.length > 0 && (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {invite.calendars?.name ?? 'Shared Calendar'}
                    </h3>
                    <p className="text-sm text-gray-600">Invited to: {invite.invited_email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Expires: {new Date(invite.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                  {invite.calendars?.color && (
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: invite.calendars.color }}
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(invite.id)}
                    disabled={actioningId === invite.id}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(invite.id)}
                    disabled={actioningId === invite.id}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <X size={16} />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
