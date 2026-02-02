'use client';

import React, { createContext, useContext, useEffect, useCallback } from 'react';
import { authClient } from '@/lib/supabase/auth';
import { useAuthStore } from '@/stores/auth-store';
import {
  AuthActions,
  AuthState,
  AuthResult,
  SignInData,
  SignUpData,
  UpdateProfileData,
  UserProfile,
} from '@/types/auth';

interface AuthContextType extends AuthState, AuthActions {}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const {
    user,
    isLoading,
    isAuthenticated,
    isInitialized,
    setUser,
    setLoading,
    setInitialized,
    logout,
  } = useAuthStore();

  // Initialize auth state on mount
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        setLoading(true);
        const profile = await authClient.getCurrentUser();

        if (mounted) {
          setUser(profile);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
        }
      } finally {
        if (mounted) {
          setInitialized(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, [setUser, setLoading, setInitialized]);

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = authClient.onAuthStateChange(
      async (event) => {
        let shouldResetLoading = false;

        try {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            return;
          }

          if (
            event === 'SIGNED_IN' ||
            event === 'PASSWORD_RECOVERY' ||
            event === 'TOKEN_REFRESHED' ||
            event === 'USER_UPDATED'
          ) {
            shouldResetLoading = true;
            setLoading(true);
            const profile = await authClient.getCurrentUser();
            setUser(profile);
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          setUser(null);
        } finally {
          if (shouldResetLoading) {
            setLoading(false);
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [setUser, setLoading]);

  // Auth actions
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        setLoading(true);
        const result = await authClient.signIn({ email, password });

        if (result.success) {
          // User profile will be set by the auth state change listener
          return result;
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: 'An unexpected error occurred',
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName?: string
    ): Promise<AuthResult> => {
      try {
        setLoading(true);
        const payload: SignUpData = { email, password };

        if (fullName) {
          payload.fullName = fullName;
        }

        const result = await authClient.signUp(payload);

        if (result.success && !result.data?.requiresConfirmation) {
          // User profile will be set by the auth state change listener
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: 'An unexpected error occurred',
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      await authClient.signOut();
      // User will be cleared by the auth state change listener
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear user state on error
      logout();
    } finally {
      setLoading(false);
    }
  }, [setLoading, logout]);

  const resetPassword = useCallback(
    async (email: string): Promise<AuthResult> => {
      try {
        setLoading(true);
        return await authClient.resetPassword(email);
      } catch (error) {
        return {
          success: false,
          error: 'An unexpected error occurred',
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const updatePassword = useCallback(
    async (password: string, currentPassword?: string): Promise<AuthResult> => {
      try {
        setLoading(true);
        return await authClient.updatePassword(password, currentPassword);
      } catch (error) {
        return {
          success: false,
          error: 'An unexpected error occurred',
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const updateProfile = useCallback(
    async (profileData: Partial<UserProfile>): Promise<AuthResult> => {
      try {
        setLoading(true);
        const result = await authClient.updateProfile(profileData);

        if (result.success) {
          // Refresh user profile
          const updatedProfile = await authClient.getCurrentUser();
          setUser(updatedProfile);
        }

        return result;
      } catch (error) {
        return {
          success: false,
          error: 'An unexpected error occurred',
        };
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading]
  );

  const resendConfirmation = useCallback(
    async (email: string): Promise<AuthResult> => {
      try {
        setLoading(true);
        return await authClient.resendConfirmation(email);
      } catch (error) {
        return {
          success: false,
          error: 'An unexpected error occurred',
        };
      } finally {
        setLoading(false);
      }
    },
    [setLoading]
  );

  const deleteAccount = useCallback(async (): Promise<AuthResult> => {
    try {
      setLoading(true);
      const result = await authClient.deleteAccount();

      if (result.success) {
        // User will be signed out and state cleared by authClient
        setUser(null);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    } finally {
      setLoading(false);
    }
  }, [setLoading, setUser]);

  const signInWithGoogle = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setLoading(true);
      const result = await authClient.signInWithOAuth('google');

      if (result.success && result.url) {
        window.location.href = result.url;
        return { success: true };
      }

      if (!result.success) {
        return { success: false, error: result.error || 'Unknown error' };
      }

      return { success: false, error: 'Failed to initiate Google sign-in' };
    } catch (error) {
      return {
        success: false,
        error: 'An unexpected error occurred',
      };
    } finally {
      setLoading(false);
    }
  }, [setLoading]);

  const contextValue: AuthContextType = {
    // State
    user,
    isLoading,
    isAuthenticated,
    isInitialized,
    // Actions
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    resendConfirmation,
    deleteAccount,
    signInWithGoogle,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Re-export the provider as default for convenience
export default AuthProvider;
