'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Calendar, Heart, User } from 'lucide-react';

const TABS = [
  { label: 'Discover',  icon: Compass,  href: '/discover'   },
  { label: 'Calendars', icon: Calendar, href: '/calendars'  },
  { label: 'Saved',     icon: Heart,    href: '/saved'      },
  { label: 'Account',   icon: User,     href: '/account'    },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#E5E7EB]"
      style={{ height: 64, paddingTop: 8, paddingBottom: 8 }}
    >
      <div className="flex h-full">
        {TABS.map(({ label, icon: Icon, href }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-1"
            >
              <Icon
                size={18}
                className={active ? 'text-[#3B82F6]' : 'text-[#6B7280]'}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className="text-[10px] font-semibold"
                style={{ color: active ? '#3B82F6' : '#6B7280' }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
