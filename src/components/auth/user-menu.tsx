'use client';

import * as React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface UserMenuProps {
  className?: string;
}

export function UserMenu({ className }: UserMenuProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center space-x-2 rounded-full bg-gray-100 p-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            className
          )}
        >
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'User avatar'}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-white">
                {getInitials(user.fullName || user.email)}
              </span>
            )}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-medium text-gray-900 truncate max-w-32">
              {user.fullName || user.email}
            </p>
          </div>
          <svg
            className="h-4 w-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          sideOffset={5}
          align="end"
        >
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.fullName || 'User'}
              </p>
              <p className="text-sm text-gray-500 truncate">
                {user.email}
              </p>
            </div>

            {/* Menu Items */}
            <DropdownMenu.Item
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer focus:outline-none focus:bg-gray-100"
              onClick={() => router.push('/calendar')}
            >
              <svg className="h-4 w-4 mr-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4m3 4H5m0 0v9a2 2 0 002 2h10a2 2 0 002-2v-9m-14 0h14" />
              </svg>
              Calendar
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />

            <DropdownMenu.Item
              className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 hover:text-red-800 cursor-pointer focus:outline-none focus:bg-red-50"
              onClick={handleSignOut}
            >
              <svg className="h-4 w-4 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// Simplified version for mobile/smaller screens
export function UserMenuMobile({ className }: UserMenuProps) {
  const { user, isAuthenticated, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-100 p-2 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            className
          )}
        >
          <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName || 'User avatar'}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="text-sm font-medium text-white">
                {getInitials(user.fullName || user.email)}
              </span>
            )}
          </div>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="min-w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50"
          sideOffset={5}
          align="end"
        >
          <div className="py-1">
            {/* User Info */}
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.fullName || 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>

            {/* Quick Actions */}
            <DropdownMenu.Item
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
              onClick={() => router.push('/calendar')}
            >
              Calendar
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="h-px bg-gray-100 my-1" />

            <DropdownMenu.Item
              className="flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50 cursor-pointer"
              onClick={handleSignOut}
            >
              Sign out
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
