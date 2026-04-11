'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Calendar, Heart, User } from 'lucide-react';

const TABS = [
  { label: 'Discover',  icon: Compass,  href: '/discover'  },
  { label: 'Calendars', icon: Calendar, href: '/calendars' },
  { label: 'Saved',     icon: Heart,    href: '/saved'     },
  { label: 'Account',   icon: User,     href: '/account'   },
];

export default function BottomTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ height: 64, background: '#ffffff', borderTop: '1.5px solid var(--engaged-border)' }}>
      <div className="flex h-full">
        {TABS.map(({ label, icon: Icon, href }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-[3px]">
              <Icon size={20} color={active ? 'var(--engaged-blue)' : 'var(--engaged-text3)'} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[10px] font-bold" style={{ color: active ? 'var(--engaged-blue)' : 'var(--engaged-text3)' }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
