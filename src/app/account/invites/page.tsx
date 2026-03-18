'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, X, Mail } from 'lucide-react';
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
            <h1 className="text-base font-bold text-[#111827]">Invites</h1>
            <p className="text-xs text-[#6B7280]">Accept or decline shared calendars</p>
          </div>
        </div>
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
              <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        )}

        {!loading && invites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
              <Mail size={28} className="text-[#3B82F6]" />
            </div>
            <h3 className="text-base font-semibold text-[#111827] mb-1">No pending invites</h3>
            <p className="text-sm text-[#6B7280]">Calendar invites will appear here</p>
          </div>
        )}

        {!loading && invites.length > 0 && (
          <div className="space-y-3">
            {invites.map((invite) => (
              <div key={invite.id} className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-[#111827] mb-1">
                      {invite.calendars?.name ?? 'Shared Calendar'}
                    </h3>
                    <p className="text-sm text-[#6B7280]">Invited to: {invite.invited_email}</p>
                    <p className="text-xs text-[#9CA3AF] mt-1">
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
                    className="flex-1 bg-[#3B82F6] text-white py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 hover:bg-[#2563EB] transition-colors"
                  >
                    <Check size={16} />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDecline(invite.id)}
                    disabled={actioningId === invite.id}
                    className="flex-1 bg-[#F3F4F6] text-[#374151] py-2.5 px-4 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 hover:bg-[#E5E7EB] transition-colors"
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
