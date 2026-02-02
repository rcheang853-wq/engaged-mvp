import './setup';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import React from 'react';
import {
  useAuth,
  useAuthState,
  useAuthActions,
  useUser,
  useIsAuthenticated,
  useAuthLoading,
} from '@/hooks/use-auth';
import { AuthProvider, AuthContext } from '@/providers/auth-provider';
import { UserProfile, AuthState, AuthActions } from '@/types/auth';

// Mock the auth store
const mockAuthStore = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,
  setUser: jest.fn(),
  setLoading: jest.fn(),
  setInitialized: jest.fn(),
  logout: jest.fn(),
};

jest.mock('@/stores/auth-store', () => ({
  useAuthStore: jest.fn(() => mockAuthStore),
}));

// Mock the auth client
jest.mock('@/lib/supabase/auth', () => ({
  authClient: {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    updateProfile: jest.fn(),
    resendConfirmation: jest.fn(),
    getCurrentUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
}));

describe('useAuth hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock store state
    mockAuthStore.user = null;
    mockAuthStore.isLoading = false;
    mockAuthStore.isAuthenticated = false;
    mockAuthStore.isInitialized = false;
  });

  describe('without AuthProvider', () => {
    it('should return store-only implementation with stub actions', () => {
      const { result } = renderHook(() => useAuth());

      expect(result.current.user).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.isInitialized).toBe(false);

      // Actions should throw errors when called without provider
      expect(async () => {
        await result.current.signIn('test@example.com', 'password');
      }).rejects.toThrow('Auth actions not available. Wrap your app with AuthProvider.');
    });
  });

  describe('with AuthProvider', () => {
    const mockAuthContext: AuthState & AuthActions = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      resendConfirmation: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    it('should return auth context when available', () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      expect(result.current).toBe(mockAuthContext);
      expect(result.current.isInitialized).toBe(true);
    });

    it('should provide working auth actions', async () => {
      const mockSignIn = jest.fn().mockResolvedValue({ success: true });
      mockAuthContext.signIn = mockSignIn;

      const { result } = renderHook(() => useAuth(), { wrapper });

      await result.current.signIn('test@example.com', 'password');

      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password');
    });
  });
});

describe('useAuthState hook', () => {
  const mockUser: UserProfile = {
    id: '123',
    email: 'test@example.com',
    fullName: 'John Doe',
    isPro: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockAuthContext: AuthState & AuthActions = {
    user: mockUser,
    isLoading: true,
    isAuthenticated: true,
    isInitialized: true,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    updateProfile: jest.fn(),
    resendConfirmation: jest.fn(),
    deleteAccount: jest.fn(),
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  );

  it('should return only auth state properties', () => {
    const { result } = renderHook(() => useAuthState(), { wrapper });

    expect(result.current).toEqual({
      user: mockUser,
      isLoading: true,
      isAuthenticated: true,
      isInitialized: true,
    });

    // Should not include actions
    expect(result.current).not.toHaveProperty('signIn');
    expect(result.current).not.toHaveProperty('signOut');
  });
});

describe('useAuthActions hook', () => {
  const mockActions = {
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    updateProfile: jest.fn(),
    resendConfirmation: jest.fn(),
    deleteAccount: jest.fn(),
  };

  const mockAuthContext: AuthState & AuthActions = {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    isInitialized: true,
    ...mockActions,
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={mockAuthContext}>
      {children}
    </AuthContext.Provider>
  );

  it('should return only auth action methods', () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    expect(result.current).toEqual(mockActions);

    // Should not include state
    expect(result.current).not.toHaveProperty('user');
    expect(result.current).not.toHaveProperty('isLoading');
    expect(result.current).not.toHaveProperty('isAuthenticated');
  });

  it('should provide working action methods', async () => {
    const { result } = renderHook(() => useAuthActions(), { wrapper });

    await result.current.signIn('test@example.com', 'password');
    expect(mockActions.signIn).toHaveBeenCalledWith('test@example.com', 'password');

    await result.current.signOut();
    expect(mockActions.signOut).toHaveBeenCalled();

    await result.current.resetPassword('test@example.com');
    expect(mockActions.resetPassword).toHaveBeenCalledWith('test@example.com');
  });
});

describe('useUser hook', () => {
  it('should return null when no user', () => {
    const mockAuthContext: AuthState & AuthActions = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      resendConfirmation: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current).toBeNull();
  });

  it('should return user when authenticated', () => {
    const mockUser: UserProfile = {
      id: '123',
      email: 'test@example.com',
      fullName: 'John Doe',
      isPro: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const mockAuthContext: AuthState & AuthActions = {
      user: mockUser,
      isLoading: false,
      isAuthenticated: true,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      resendConfirmation: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current).toEqual(mockUser);
  });
});

describe('useIsAuthenticated hook', () => {
  it('should return false when not authenticated', () => {
    const mockAuthContext: AuthState & AuthActions = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      resendConfirmation: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

    expect(result.current).toBe(false);
  });

  it('should return true when authenticated', () => {
    const mockAuthContext: AuthState & AuthActions = {
      user: { id: '123', email: 'test@example.com', isPro: false, createdAt: new Date(), updatedAt: new Date() },
      isLoading: false,
      isAuthenticated: true,
      isInitialized: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      resendConfirmation: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });

    expect(result.current).toBe(true);
  });
});

describe('useAuthLoading hook', () => {
  it('should return loading state', () => {
    const mockAuthContext: AuthState & AuthActions = {
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isInitialized: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPassword: jest.fn(),
      updatePassword: jest.fn(),
      updateProfile: jest.fn(),
      resendConfirmation: jest.fn(),
      deleteAccount: jest.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuthLoading(), { wrapper });

    expect(result.current).toBe(true);
  });
});