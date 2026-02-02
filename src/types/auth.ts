import { User } from '@supabase/supabase-js';

// Core authentication types
export interface AuthUser extends User {
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
  isPro: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  categories?: string[];
  locations?: string[];
  notifications?: {
    email: boolean;
    push: boolean;
  };
  privacy?: {
    shareProfile: boolean;
    shareActivity: boolean;
  };
}

// Authentication state
export interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

// Authentication actions
export interface AuthActions {
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, fullName?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string, currentPassword?: string) => Promise<AuthResult>;
  updateProfile: (profile: Partial<UserProfile>) => Promise<AuthResult>;
  resendConfirmation: (email: string) => Promise<AuthResult>;
  deleteAccount: () => Promise<AuthResult>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
}

// Authentication results
export interface AuthResult {
  success: boolean;
  error?: string;
  data?: any;
}

// Form data types
export interface SignInData {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName?: string;
  confirmPassword?: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  confirmPassword: string;
}

export interface UpdateProfileData {
  fullName?: string;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

// Authentication events
export type AuthEvent =
  | 'SIGNED_IN'
  | 'SIGNED_OUT'
  | 'TOKEN_REFRESHED'
  | 'USER_UPDATED'
  | 'PASSWORD_RECOVERY';

export interface AuthEventData {
  event: AuthEvent;
  session: any;
  user?: UserProfile;
}

// Route protection
export interface ProtectedRouteConfig {
  redirectTo?: string;
  requireAuth?: boolean;
  requireNoAuth?: boolean;
  allowedRoles?: string[];
}

// Session management
export interface SessionData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: UserProfile;
}

// Error types
export type AuthError =
  | 'invalid_credentials'
  | 'user_not_found'
  | 'email_not_confirmed'
  | 'weak_password'
  | 'email_taken'
  | 'network_error'
  | 'unknown_error';

export interface AuthErrorResponse {
  error: AuthError;
  message: string;
  details?: any;
}