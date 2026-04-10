'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Bell, Puzzle, HelpCircle, Mail, LogOut, MessageSquare } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';
import FeedbackModal from '@/components/FeedbackModal';

interface UserProfile { name: string; email: string; avatarInitial: string; }

const MENU_ROWS = [
  { label: 'Invites',       icon: Mail,       href: '/account/invites'       },
  { label: 'Location',      icon: MapPin,     href: '/account/location'      },
  { label: 'Notifications', icon: Bell,       href: '/account/notifications' },
  { label: 'Integrations',  icon: Puzzle,     href: '/account/integrations'  },
  { label: 'Help',          icon: HelpCircle, href: '/account/help'          },
];

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile]           = useState<UserProfile | null>(null);
  const [loading, setLoading]           = useState(true);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      if (d.user) {
        const email: string = d.user.email ?? '';
        const meta = d.user.user_metadata ?? {};
        const name: string = meta.full_name ?? meta.name ?? email.split('@')[0] ?? 'User';
        setProfile({ name, email, avatarInitial: name[0]?.toUpperCase() ?? 'U' });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/auth/signin');
  }

  return (
    <div className="min-h-screen pb-20" style={{ background: 'var(--engaged-bg)' }}>
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3" style={{ background: 'var(--engaged-bg)' }}>
        <div className="flex items-center justify-between h-8">
          <div className="w-8" />
          <h1 className="text-2xl font-black tracking-[-0.05em]" style={{ color: 'var(--engaged-text)' }}>Account</h1>
          <button onClick={() => setFeedbackOpen(true)} className="flex items-center gap-1 text-xs font-bold" style={{ color: 'var(--engaged-blue)' }}>
            <MessageSquare size={15} />Feedback
          </button>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      <div className="px-4 space-y-3 max-w-2xl mx-auto">
        <div className="rounded-2xl px-4 py-4 flex items-center gap-3" style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}>
          {loading ? (
            <>
              <div className="w-11 h-11 rounded-full animate-pulse flex-shrink-0" style={{ background: 'var(--engaged-border)' }} />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 rounded w-1/3 animate-pulse" style={{ background: 'var(--engaged-border)' }} />
                <div className="h-3 rounded w-1/2 animate-pulse" style={{ background: 'var(--engaged-border)' }} />
              </div>
            </>
          ) : profile ? (
            <>
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold" style={{ background: 'var(--engaged-blue)' }}>{profile.avatarInitial}</div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate" style={{ color: 'var(--engaged-text)' }}>{profile.name}</p>
                <p className="text-xs font-medium truncate" style={{ color: 'var(--engaged-text2)' }}>{profile.email}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--engaged-border)' }}>
                <span className="text-sm font-bold" style={{ color: 'var(--engaged-text2)' }}>?</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--engaged-text)' }}>Not signed in</p>
                <button onClick={() => router.push('/auth/signin')} className="text-xs font-bold" style={{ color: 'var(--engaged-blue)' }}>Sign in →</button>
              </div>
            </>
          )}
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}>
          {MENU_ROWS.map(({ label, href, icon: Icon }, i) => (
            <button key={label} onClick={() => router.push(href)} className="w-full flex items-center justify-between px-4 h-12 hover:opacity-80"
              style={{ borderBottom: i < MENU_ROWS.length - 1 ? '1px solid var(--engaged-border)' : undefined }}>
              <span className="flex items-center gap-3">
                <Icon size={18} style={{ color: 'var(--engaged-text2)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--engaged-text)' }}>{label}</span>
              </span>
              <ChevronRight size={18} style={{ color: 'var(--engaged-border)' }} />
            </button>
          ))}
        </div>

        {profile && (
          <button onClick={handleSignOut} className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 hover:opacity-80" style={{ background: '#fff', border: '1.5px solid var(--engaged-border)' }}>
            <LogOut size={18} style={{ color: '#EF4444' }} />
            <span className="text-sm font-bold" style={{ color: '#EF4444' }}>Sign out</span>
          </button>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}
