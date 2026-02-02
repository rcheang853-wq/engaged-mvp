import { describe, it, expect } from '@jest/globals';
import {
  AuthState,
  AuthActions,
  UserProfile,
  AuthResult,
  SignInData,
  SignUpData,
  UpdateProfileData,
  AuthError,
} from '@/types/auth';

describe('Auth Types', () => {
  describe('UserProfile', () => {
    it('should have required properties', () => {
      const userProfile: UserProfile = {
        id: '123',
        email: 'test@example.com',
        isPro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userProfile.id).toBe('123');
      expect(userProfile.email).toBe('test@example.com');
      expect(userProfile.isPro).toBe(false);
      expect(userProfile.createdAt).toBeInstanceOf(Date);
      expect(userProfile.updatedAt).toBeInstanceOf(Date);
    });

    it('should allow optional properties', () => {
      const userProfile: UserProfile = {
        id: '123',
        email: 'test@example.com',
        fullName: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: {
          categories: ['tech', 'music'],
          notifications: { email: true, push: false },
          privacy: { shareProfile: true, shareActivity: false },
        },
        isPro: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(userProfile.fullName).toBe('John Doe');
      expect(userProfile.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(userProfile.preferences?.categories).toEqual(['tech', 'music']);
      expect(userProfile.isPro).toBe(true);
    });
  });

  describe('AuthState', () => {
    it('should define correct state structure', () => {
      const authState: AuthState = {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        isInitialized: true,
      };

      expect(authState.user).toBeNull();
      expect(authState.isLoading).toBe(false);
      expect(authState.isAuthenticated).toBe(false);
      expect(authState.isInitialized).toBe(true);
    });

    it('should work with authenticated state', () => {
      const user: UserProfile = {
        id: '123',
        email: 'test@example.com',
        isPro: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const authState: AuthState = {
        user,
        isLoading: false,
        isAuthenticated: true,
        isInitialized: true,
      };

      expect(authState.user).toEqual(user);
      expect(authState.isAuthenticated).toBe(true);
    });
  });

  describe('AuthResult', () => {
    it('should define success result', () => {
      const result: AuthResult = {
        success: true,
      };

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should define error result', () => {
      const result: AuthResult = {
        success: false,
        error: 'Invalid credentials',
      };

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should define result with data', () => {
      const result: AuthResult = {
        success: true,
        data: { requiresConfirmation: true },
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ requiresConfirmation: true });
    });
  });

  describe('Form Data Types', () => {
    it('should define SignInData', () => {
      const data: SignInData = {
        email: 'test@example.com',
        password: 'password123',
      };

      expect(data.email).toBe('test@example.com');
      expect(data.password).toBe('password123');
    });

    it('should define SignUpData', () => {
      const data: SignUpData = {
        email: 'test@example.com',
        password: 'password123',
        fullName: 'John Doe',
        confirmPassword: 'password123',
      };

      expect(data.email).toBe('test@example.com');
      expect(data.password).toBe('password123');
      expect(data.fullName).toBe('John Doe');
      expect(data.confirmPassword).toBe('password123');
    });

    it('should define UpdateProfileData', () => {
      const data: UpdateProfileData = {
        fullName: 'Jane Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
        preferences: {
          categories: ['sports'],
          notifications: { email: false, push: true },
        },
      };

      expect(data.fullName).toBe('Jane Doe');
      expect(data.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(data.preferences?.categories).toEqual(['sports']);
    });
  });

  describe('Error Types', () => {
    it('should define AuthError types', () => {
      const errors: AuthError[] = [
        'invalid_credentials',
        'user_not_found',
        'email_not_confirmed',
        'weak_password',
        'email_taken',
        'network_error',
        'unknown_error',
      ];

      errors.forEach(error => {
        expect(typeof error).toBe('string');
      });
    });
  });
});