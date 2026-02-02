import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth-store';
import { UserProfile } from '@/types/auth';

// Mock zustand persist
jest.mock('zustand/middleware', () => ({
  persist: (fn: any) => fn,
}));

describe('Auth Store', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuthStore.getState().logout();
    useAuthStore.getState().setInitialized(false);
    useAuthStore.getState().setLoading(false);
  });

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('setUser', () => {
    it('should set user and mark as authenticated when user is provided', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser: UserProfile = {
        id: '123',
        email: 'test@example.com',
        fullName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: {
          categories: ['tech', 'music'],
          notifications: { email: true, push: false },
        },
        isPro: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear user and mark as unauthenticated when null is provided', () => {
      const { result } = renderHook(() => useAuthStore());

      // First set a user
      const mockUser: UserProfile = {
        id: '123',
        email: 'test@example.com',
        isPro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(result.current.isAuthenticated).toBe(true);

      // Then clear the user
      act(() => {
        result.current.setUser(null);
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setLoading', () => {
    it('should update loading state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('setInitialized', () => {
    it('should update initialized state', () => {
      const { result } = renderHook(() => useAuthStore());

      expect(result.current.isInitialized).toBe(false);

      act(() => {
        result.current.setInitialized(true);
      });

      expect(result.current.isInitialized).toBe(true);

      act(() => {
        result.current.setInitialized(false);
      });

      expect(result.current.isInitialized).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear user and reset authentication state', () => {
      const { result } = renderHook(() => useAuthStore());

      // Set initial state with user and loading
      const mockUser: UserProfile = {
        id: '123',
        email: 'test@example.com',
        isPro: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.setUser(mockUser);
        result.current.setLoading(true);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(true);

      // Logout
      act(() => {
        result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('state consistency', () => {
    it('should maintain consistency between user and isAuthenticated', () => {
      const { result } = renderHook(() => useAuthStore());

      // Test authenticated state
      const mockUser: UserProfile = {
        id: '123',
        email: 'test@example.com',
        isPro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.setUser(mockUser);
      });

      expect(!!result.current.user).toBe(result.current.isAuthenticated);

      // Test unauthenticated state
      act(() => {
        result.current.setUser(null);
      });

      expect(!!result.current.user).toBe(result.current.isAuthenticated);
    });

    it('should handle complex user profile updates', () => {
      const { result } = renderHook(() => useAuthStore());

      const initialUser: UserProfile = {
        id: '123',
        email: 'test@example.com',
        fullName: 'John Doe',
        isPro: false,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      act(() => {
        result.current.setUser(initialUser);
      });

      expect(result.current.user?.fullName).toBe('John Doe');
      expect(result.current.user?.isPro).toBe(false);

      // Update user profile
      const updatedUser: UserProfile = {
        ...initialUser,
        fullName: 'Jane Doe',
        isPro: true,
        avatarUrl: 'https://example.com/new-avatar.jpg',
        preferences: {
          categories: ['sports', 'food'],
          notifications: { email: false, push: true },
          privacy: { shareProfile: true, shareActivity: false },
        },
        updatedAt: new Date('2023-01-02'),
      };

      act(() => {
        result.current.setUser(updatedUser);
      });

      expect(result.current.user?.fullName).toBe('Jane Doe');
      expect(result.current.user?.isPro).toBe(true);
      expect(result.current.user?.avatarUrl).toBe('https://example.com/new-avatar.jpg');
      expect(result.current.user?.preferences?.categories).toEqual(['sports', 'food']);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid state changes correctly', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser: UserProfile = {
        id: '123',
        email: 'test@example.com',
        isPro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        // Simulate rapid state changes
        result.current.setLoading(true);
        result.current.setUser(mockUser);
        result.current.setInitialized(true);
        result.current.setLoading(false);
      });

      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isInitialized).toBe(true);
    });

    it('should handle user updates during loading', () => {
      const { result } = renderHook(() => useAuthStore());

      const mockUser: UserProfile = {
        id: '123',
        email: 'test@example.com',
        isPro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setUser(mockUser);
      });

      // setUser should automatically set loading to false
      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toEqual(mockUser);
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});