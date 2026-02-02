import './setup';
import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { SignInData, SignUpData, UpdateProfileData } from '@/types/auth';

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    signInWithPassword: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPasswordForEmail: jest.fn(),
    updateUser: jest.fn(),
    getUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    resend: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

// Mock the createBrowserSupabaseClient function
jest.mock('@/lib/supabase/auth', () => ({
  createBrowserSupabaseClient: () => mockSupabaseClient,
  SupabaseAuth: jest.fn().mockImplementation(() => ({
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    resetPassword: jest.fn(),
    updatePassword: jest.fn(),
    updateProfile: jest.fn(),
    resendConfirmation: jest.fn(),
    getCurrentUser: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
    deleteAccount: jest.fn(),
  })),
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
    onAuthStateChange: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));

// Import after mocking
const { SupabaseAuth, authClient } = require('@/lib/supabase/auth');

describe('SupabaseAuth', () => {
  let auth: SupabaseAuth;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    auth = new SupabaseAuth();

    // Set up default mock implementations
    mockSupabaseClient.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('signIn', () => {
    it('should successfully sign in with valid credentials', async () => {
      const signInData: SignInData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: { id: '123', email: 'test@example.com' }, session: {} },
        error: null,
      });

      const result = await auth.signIn(signInData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.signInWithPassword).toHaveBeenCalledWith({
        email: signInData.email,
        password: signInData.password,
      });
    });

    it('should handle invalid credentials error', async () => {
      const signInData: SignInData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      });

      const result = await auth.signIn(signInData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });

    it('should handle network errors', async () => {
      const signInData: SignInData = {
        email: 'test@example.com',
        password: 'password123',
      };

      mockSupabaseClient.auth.signInWithPassword.mockRejectedValue(
        new Error('Network error')
      );

      const result = await auth.signIn(signInData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error occurred');
    });
  });

  describe('signUp', () => {
    it('should successfully sign up with valid data', async () => {
      const signUpData: SignUpData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'John Doe',
      };

      const origin = window.location.origin;

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: {}
        },
        error: null,
      });

      const result = await auth.signUp(signUpData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.signUp).toHaveBeenCalledWith({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          data: {
            full_name: signUpData.fullName,
          },
          emailRedirectTo: `${origin}/auth/signin`,
        },
      });
    });

    it('should handle email confirmation requirement', async () => {
      const signUpData: SignUpData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'John Doe',
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: {
          user: { id: '123', email: 'test@example.com' },
          session: null // No session means confirmation required
        },
        error: null,
      });

      const result = await auth.signUp(signUpData);

      expect(result.success).toBe(true);
      expect(result.data?.requiresConfirmation).toBe(true);
    });

    it('should handle existing user error', async () => {
      const signUpData: SignUpData = {
        email: 'existing@example.com',
        password: 'password123',
      };

      mockSupabaseClient.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered' },
      });

      const result = await auth.signUp(signUpData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('An account with this email already exists');
    });
  });

  describe('signOut', () => {
    it('should successfully sign out', async () => {
      mockSupabaseClient.auth.signOut.mockResolvedValue({ error: null });

      await auth.signOut();

      expect(mockSupabaseClient.auth.signOut).toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    beforeEach(() => {
      // Mock window.location.origin
      delete (window as any).location;
      (window as any).location = { origin: 'http://localhost:3000' };
    });

    it('should successfully send password reset email', async () => {
      const email = 'test@example.com';

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: null,
      });

      const result = await auth.resetPassword(email);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.resetPasswordForEmail).toHaveBeenCalledWith(
        email,
        {
          redirectTo: 'http://localhost:3000/auth/reset-password',
        }
      );
    });

    it('should handle invalid email error', async () => {
      const email = 'invalid-email';

      mockSupabaseClient.auth.resetPasswordForEmail.mockResolvedValue({
        data: {},
        error: { message: 'Invalid email' },
      });

      const result = await auth.resetPassword(email);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Please enter a valid email address');
    });
  });

  describe('updateProfile', () => {
    it('should successfully update user profile', async () => {
      const profileData: UpdateProfileData = {
        fullName: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      };

      const mockUser = { id: '123', email: 'test@example.com' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabaseClient.auth.updateUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockUpdate = jest.fn().mockResolvedValue({ error: null });
      const mockEq = jest.fn().mockReturnValue(mockUpdate);
      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnValue({
          eq: mockEq,
        }),
      });
      mockSupabaseClient.from.mockReturnValue(mockFrom());

      const result = await auth.updateProfile(profileData);

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.auth.updateUser).toHaveBeenCalledWith({
        data: { full_name: profileData.fullName },
      });
    });

    it('should handle unauthenticated user', async () => {
      const profileData: UpdateProfileData = {
        fullName: 'Jane Doe',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await auth.updateProfile(profileData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not authenticated');
    });
  });

  describe('getCurrentUser', () => {
    it('should return user profile when authenticated', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };
      const mockProfile = {
        id: '123',
        email: 'test@example.com',
        full_name: 'John Doe',
        avatar_url: null,
        preferences: {},
        is_pro: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({ data: mockProfile });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      mockSupabaseClient.from.mockReturnValue(mockFrom());

      const result = await auth.getCurrentUser();

      expect(result).toEqual({
        id: '123',
        email: 'test@example.com',
        fullName: 'John Doe',
        avatarUrl: null,
        preferences: {},
        isPro: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });

    it('should return null when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const result = await auth.getCurrentUser();

      expect(result).toBeNull();
    });

    it('should return null when profile not found', async () => {
      const mockUser = { id: '123', email: 'test@example.com' };

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      const mockSingle = jest.fn().mockResolvedValue({ data: null });
      const mockEq = jest.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = jest.fn().mockReturnValue({ eq: mockEq });
      const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });
      mockSupabaseClient.from.mockReturnValue(mockFrom());

      const result = await auth.getCurrentUser();

      expect(result).toBeNull();
    });
  });

  describe('error mapping', () => {
    it('should map common auth errors to user-friendly messages', async () => {
      const testCases = [
        {
          input: 'Invalid login credentials',
          expected: 'Invalid email or password',
        },
        {
          input: 'Email not confirmed',
          expected: 'Please check your email and click the confirmation link',
        },
        {
          input: 'Password should be at least 6 characters',
          expected: 'Password must be at least 6 characters long',
        },
        {
          input: 'Unknown error message',
          expected: 'Unknown error message',
        },
      ];

      for (const testCase of testCases) {
        mockSupabaseClient.auth.signInWithPassword.mockResolvedValue({
          data: { user: null, session: null },
          error: { message: testCase.input },
        });

        const result = await auth.signIn({
          email: 'test@example.com',
          password: 'password',
        });

        expect(result.error).toBe(testCase.expected);
      }
    });
  });
});
