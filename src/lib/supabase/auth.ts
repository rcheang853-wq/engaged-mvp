import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthResult,
  UserProfile,
  SignInData,
  SignUpData,
  UpdateProfileData,
  AuthError
} from '@/types/auth';
import { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env.local file.'
  );
}

type BrowserSupabaseClient = ReturnType<typeof createBrowserClient<Database>>;
type UniversalSupabaseClient = ReturnType<typeof createClient<Database>>;

const globalForSupabase = globalThis as typeof globalThis & {
  __engagedBrowserSupabase?: BrowserSupabaseClient | UniversalSupabaseClient;
};

// Browser client for client-side operations (singleton)
export function createBrowserSupabaseClient() {
  if (!globalForSupabase.__engagedBrowserSupabase) {
    const factory = typeof window === 'undefined' ? createClient : createBrowserClient;
    globalForSupabase.__engagedBrowserSupabase = factory<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      }
    );
  }

  return globalForSupabase.__engagedBrowserSupabase as BrowserSupabaseClient;
}

// Server client for server-side operations (App Router)
export async function createServerSupabaseClient() {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

// Middleware client for middleware operations
export function createMiddlewareSupabaseClient(
  request: NextRequest,
  response: NextResponse
) {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

// Auth utility functions
export class SupabaseAuth {
  private client: ReturnType<typeof createBrowserSupabaseClient>;

  constructor() {
    this.client = createBrowserSupabaseClient();
  }

  async signIn(data: SignInData): Promise<AuthResult> {
    try {
      const { error } = await this.client.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      // IMPORTANT: our app relies on a row in `public.profiles` for "isAuthenticated".
      // If that row isn't created, the UI will look like login is "stuck".
      await this.ensureProfileForCurrentUser();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async signUp(data: SignUpData): Promise<AuthResult> {
    try {
      const origin = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

      const { data: authData, error } = await this.client.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName || '',
          },
          // Send confirmation links back to our callback handler so it can exchange the code for a session.
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      // If user is created but needs email confirmation
      if (authData.user && !authData.session) {
        return {
          success: true,
          data: { requiresConfirmation: true },
        };
      }

      // If confirmation is disabled (or user already confirmed), Supabase gives us a session.
      // Create the `profiles` row immediately so the app can treat the user as authenticated.
      await this.ensureProfileForCurrentUser();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  async resetPassword(email: string): Promise<AuthResult> {
    try {
      // Safely get the origin for redirect URL
      const origin = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

      const { error } = await this.client.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/auth/reset-password`,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async updatePassword(password: string, currentPassword?: string): Promise<AuthResult> {
    try {
      const { data: { session } } = await this.client.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: 'Your password reset link is invalid or has expired. Please request a new one.',
        };
      }

      // If current password is provided, verify it first
      if (currentPassword) {
        const { data: { user } } = await this.client.auth.getUser();
        if (user?.email) {
          const verifyResult = await this.signIn({
            email: user.email,
            password: currentPassword
          });

          if (!verifyResult.success) {
            return {
              success: false,
              error: 'Current password is incorrect',
            };
          }
        }
      }

      const { error } = await this.client.auth.updateUser({
        password,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async updateProfile(profileData: UpdateProfileData): Promise<AuthResult> {
    try {
      const { data: { user } } = await this.client.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // Update auth user metadata
      if (profileData.fullName) {
        const { error: authError } = await this.client.auth.updateUser({
          data: { full_name: profileData.fullName },
        });

        if (authError) {
          return {
            success: false,
            error: this.mapAuthError(authError.message),
          };
        }
      }

      // Update profile in database
      const { error: profileError } = await this.client
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          avatar_url: profileData.avatarUrl,
          preferences: profileData.preferences,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        return {
          success: false,
          error: 'Failed to update profile',
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async resendConfirmation(email: string): Promise<AuthResult> {
    try {
      const { error } = await this.client.auth.resend({
        type: 'signup',
        email,
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const { data: { user } } = await this.client.auth.getUser();

      if (!user) return null;

      // Ensure a matching `profiles` row exists.
      // This fixes the "can't get past login" symptom when auth is successful but profile wasn't created.
      await this.ensureProfileForCurrentUser(user);

      const { data: profile } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      // If we STILL can't read the profile (RLS / transient), fall back to minimal auth user info.
      if (!profile) {
        return {
          id: user.id,
          email: user.email || '',
          fullName: (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.fullName || null,
          avatarUrl: (user.user_metadata as any)?.avatar_url || null,
          preferences: {},
          isPro: false,
          createdAt: user.created_at ? new Date(user.created_at) : new Date(),
          updatedAt: new Date(),
        };
      }

      return this.mapProfileFromDatabase(profile);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async getSession() {
    return this.client.auth.getSession();
  }

  async exchangeCodeForSession(code: string): Promise<AuthResult> {
    try {
      const { data, error } = await this.client.auth.exchangeCodeForSession(code);

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  async signInWithOAuth(provider: 'google'): Promise<{ success: boolean; error?: string; url?: string }> {
    try {
      const origin = typeof window !== 'undefined'
        ? window.location.origin
        : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

      const { data, error } = await this.client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return {
          success: false,
          error: this.mapAuthError(error.message),
        };
      }

      if (data.url) {
        return { success: true, url: data.url };
      }

      return {
        success: false,
        error: 'Failed to initiate OAuth flow',
      };
    } catch (error) {
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return this.client.auth.onAuthStateChange(callback);
  }

  async deleteAccount(): Promise<AuthResult> {
    try {
      const { data: { user } } = await this.client.auth.getUser();

      if (!user) {
        return {
          success: false,
          error: 'User not authenticated',
        };
      }

      // Delete profile data first
      const { error: profileError } = await this.client
        .from('profiles')
        .delete()
        .eq('id', user.id);

      if (profileError) {
        console.error('Error deleting profile:', profileError);
        // Continue with auth deletion even if profile deletion fails
      }

      // Delete the user from auth
      const { error: authError } = await this.client.rpc('delete_user');

      if (authError) {
        return {
          success: false,
          error: 'Failed to delete account. Please contact support.',
        };
      }

      // Sign out the user
      await this.client.auth.signOut();

      return { success: true };
    } catch (error) {
      console.error('Account deletion error:', error);
      return {
        success: false,
        error: 'Network error occurred',
      };
    }
  }

  private async ensureProfileForCurrentUser(passedUser?: any) {
    const { data: { user } } = passedUser
      ? { data: { user: passedUser } }
      : await this.client.auth.getUser();

    if (!user) return;

    // Check if profile exists
    const { data: existing } = await this.client
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing?.id) return;

    // Create minimal profile row
    const fullName = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.fullName || null;
    const avatarUrl = (user.user_metadata as any)?.avatar_url || null;
    const emailVerified = !!(user.email_confirmed_at || (user as any).confirmed_at);

    // Best-effort insert; ignore conflicts
    await this.client
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: fullName,
        avatar_url: avatarUrl,
        email_verified: emailVerified,
      } as any);
  }

  private mapAuthError(message: string): string {
    // Map Supabase error messages to user-friendly messages
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (message.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link';
    }
    if (message.includes('Password should be at least')) {
      return 'Password must be at least 6 characters long';
    }
    if (message.includes('User already registered')) {
      return 'An account with this email already exists';
    }
    if (message.includes('Invalid email')) {
      return 'Please enter a valid email address';
    }
    if (message.includes('Auth session missing')) {
      return 'Your password reset link is invalid or has expired. Please request a new one.';
    }

    return message || 'An unexpected error occurred';
  }

  private mapProfileFromDatabase(profile: any): UserProfile {
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      avatarUrl: profile.avatar_url,
      preferences: profile.preferences,
      isPro: profile.is_pro || false,
      createdAt: new Date(profile.created_at),
      updatedAt: new Date(profile.updated_at),
    };
  }
}

// Export a singleton instance
export const authClient = new SupabaseAuth();

// Type exports
export type SupabaseClient = ReturnType<typeof createBrowserSupabaseClient>;
