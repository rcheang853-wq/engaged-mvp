import { useContext } from 'react';
import { AuthContext } from '@/providers/auth-provider';
import { useAuthStore as useAuthStoreInternal } from '@/stores/auth-store';
import {
  AuthState,
  AuthActions,
  UserProfile,
  AuthResult,
  SignInData,
  SignUpData,
  UpdateProfileData,
} from '@/types/auth';

// Primary hook that uses the AuthContext when available
export function useAuth(): AuthState & AuthActions {
  const context = useContext(AuthContext);

  if (context) {
    return context;
  }

  // Fallback to store-only implementation for backwards compatibility
  return useAuthStoreOnly();
}

// Direct store access hook for components that need store access outside provider
export function useAuthStoreOnly() {
  const store = useAuthStoreInternal();

  // Create stub actions for store-only usage
  const actions: AuthActions = {
    signIn: async (email: string, password: string): Promise<AuthResult> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    signUp: async (email: string, password: string, fullName?: string): Promise<AuthResult> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    signOut: async (): Promise<void> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    resetPassword: async (email: string): Promise<AuthResult> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    updatePassword: async (password: string): Promise<AuthResult> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    updateProfile: async (profile: Partial<UserProfile>): Promise<AuthResult> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    resendConfirmation: async (email: string): Promise<AuthResult> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    deleteAccount: async (): Promise<AuthResult> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
    signInWithGoogle: async (): Promise<{ success: boolean; error?: string }> => {
      throw new Error('Auth actions not available. Wrap your app with AuthProvider.');
    },
  };

  return {
    ...store,
    ...actions,
  };
}

// Utility hooks for specific use cases
export function useAuthState(): AuthState {
  const { user, isLoading, isAuthenticated, isInitialized } = useAuth();
  return { user, isLoading, isAuthenticated, isInitialized };
}

export function useAuthActions(): AuthActions {
  const {
    signIn,
    signOut,
    signUp,
    resetPassword,
    updatePassword,
    updateProfile,
    resendConfirmation,
    deleteAccount,
    signInWithGoogle,
  } = useAuth();

  return {
    signIn,
    signOut,
    signUp,
    resetPassword,
    updatePassword,
    updateProfile,
    resendConfirmation,
    deleteAccount,
    signInWithGoogle,
  };
}

export function useUser(): UserProfile | null {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuth();
  return isAuthenticated;
}

export function useAuthLoading(): boolean {
  const { isLoading } = useAuth();
  return isLoading;
}
