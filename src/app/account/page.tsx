'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, Bell, Puzzle, HelpCircle, Mail, LogOut } from 'lucide-react';
import BottomTabBar from '@/components/BottomTabBar';

interface UserProfile {
  name: string;
  email: string;
  avatarInitial: string;
}

const MENU_ROWS = [
  { label: 'Invites',       icon: Mail,      href: '/account/invites'       },
  { label: 'Location',      icon: MapPin,    href: '/account/location'      },
  { label: 'Notifications', icon: Bell,      href: '/account/notifications' },
  { label: 'Integrations',  icon: Puzzle,    href: '/account/integrations'  },
  { label: 'Help',          icon: HelpCircle,href: '/account/help'          },
];

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch current user from Supabase auth
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => {
        if (d.user) {
          const email: string = d.user.email ?? '';
          const meta = d.user.user_metadata ?? {};
          const name: string =
            meta.full_name ?? meta.name ?? email.split('@')[0] ?? 'User';
          setProfile({
            name,
            email,
            avatarInitial: name[0]?.toUpperCase() ?? 'U',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    router.push('/auth/signin');
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] pb-20">

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#F9FAFB] px-4 pt-12 pb-3">
        <div className="flex items-center justify-center h-8">
          <h1 className="text-base font-bold text-[#111827]">Account</h1>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 space-y-3">

        {/* Profile card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl px-4 py-4 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
          {loading ? (
            <>
              <div className="w-11 h-11 rounded-full bg-gray-100 animate-pulse flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-3.5 bg-gray-100 rounded w-1/3 animate-pulse" />
                <div className="h-3 bg-gray-100 rounded w-1/2 animate-pulse" />
              </div>
            </>
          ) : profile ? (
            <>
              <div className="w-11 h-11 rounded-full bg-[#3B82F6] flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">{profile.avatarInitial}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] truncate">{profile.name}</p>
                <p className="text-xs font-medium text-[#6B7280] truncate">{profile.email}</p>
              </div>
            </>
          ) : (
            <>
              <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                <span className="text-gray-400 text-sm font-bold">?</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827]">Not signed in</p>
                <button
                  onClick={() => router.push('/dev-login')}
                  className="text-xs font-semibold text-[#3B82F6] hover:text-[#2563EB] transition-colors"
                >
                  Dev login -&gt;
                </button>
              </div>
            </>
          )}
        </div>

        {/* Settings card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-sm">
          {MENU_ROWS.map(({ label, href, icon: Icon }, i) => (
            <button
              key={label}
              onClick={() => router.push(href)}
              className="w-full flex items-center justify-between px-4 h-12 hover:bg-[#F9FAFB] transition-colors"
              style={{
                borderBottom: i < MENU_ROWS.length - 1 ? '1px solid #E5E7EB' : undefined,
              }}
            >
              <span className="flex items-center gap-2 text-sm font-medium text-[#374151]">
                <Icon size={16} className="text-[#9CA3AF]" />
                {label}
              </span>
              <ChevronRight size={16} className="text-[#9CA3AF]" />
            </button>
          ))}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-between px-4 h-12 border-t border-[#E5E7EB] hover:bg-red-50 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-[#EF4444]">
              <LogOut size={16} />
              Sign out
            </span>
            <ChevronRight size={16} className="text-transparent" />
          </button>
        </div>

        {/* App version */}
        <p className="text-center text-[10px] font-medium text-[#9CA3AF] pt-2">
          Engage Calendar - v0.1.0-beta
        </p>
      </div>

      <BottomTabBar />
    </div>
  );
}

