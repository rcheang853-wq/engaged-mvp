'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormField,
  FormLabel,
  FormInput,
  FormError,
  PasswordInput,
} from '@/components/ui/form-components';

// Validation schema
const signInSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

type SignInFormData = z.infer<typeof signInSchema>;

interface SignInFormProps {
  onSuccess?: () => void;
  onForgotPassword?: () => void;
  onSignUp?: () => void;
  redirectTo?: string;
  className?: string;
}

export function SignInForm({
  onSuccess,
  onForgotPassword,
  onSignUp,
  redirectTo,
  className
}: SignInFormProps) {
  const { signIn, resendConfirmation, signInWithGoogle, isLoading } = useAuth();
  const [isResending, setIsResending] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = React.useState(false);

  const form = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      setError(null);
      setSuccessMessage(null);
      setNeedsConfirmation(false);

      const result = await signIn(data.email, data.password);

      if (!result.success) {
        const message = result.error || 'Failed to sign in. Please try again.';
        setError(message);
        setNeedsConfirmation(message.toLowerCase().includes('confirmation'));
        return;
      }

      // Success - auth state will be handled by useAuth hook
      onSuccess?.();
    } catch (err) {
      console.error('Sign in error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleResendConfirmation = async () => {
    const email = form.getValues('email');

    if (!email) {
      setError('Enter your email first so we can resend the confirmation link.');
      return;
    }

    try {
      setIsResending(true);
      setError(null);
      setSuccessMessage(null);

      const result = await resendConfirmation(email);

      if (!result.success) {
        setError(result.error || 'Failed to resend confirmation email.');
        return;
      }

      setSuccessMessage('Confirmation email resent. Please check your inbox.');
    } catch (err) {
      console.error('Resend confirmation error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const GoogleIcon = () => (
    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );

  return (
    <div className={className}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Welcome back</h2>
        <p className="text-sm text-gray-500 mt-1">Sign in to your account to continue</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex gap-2">
          <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4 flex gap-2">
          <svg className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Google OAuth - social-first */}
      <Button
        type="button"
        variant="outline"
        disabled={isGoogleLoading || isLoading}
        className="w-full mb-4"
        size="lg"
        onClick={async () => {
          try {
            setError(null);
            setIsGoogleLoading(true);
            const result = await signInWithGoogle(redirectTo);
            if (!result.success) {
              setError(result.error || 'Failed to sign in with Google');
            }
          } catch (err) {
            console.error('Google sign-in error:', err);
            setError('An unexpected error occurred. Please try again.');
          } finally {
            setIsGoogleLoading(false);
          }
        }}
      >
        {isGoogleLoading ? (
          <div className="flex items-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Connecting to Google...
          </div>
        ) : (
          <div className="flex items-center justify-center">
            <GoogleIcon />
            Continue with Google
          </div>
        )}
      </Button>

      <div className="relative mb-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-white text-gray-400 font-medium uppercase tracking-wider">or</span>
        </div>
      </div>

      <Form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField>
          <FormLabel htmlFor="email" required>Email address</FormLabel>
          <FormInput
            id="email"
            type="email"
            placeholder="you@example.com"
            error={!!form.formState.errors.email}
            {...form.register('email')}
          />
          <FormError>{form.formState.errors.email?.message}</FormError>
        </FormField>

        <FormField>
          <div className="flex items-center justify-between mb-1">
            <FormLabel htmlFor="password" required>Password</FormLabel>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs text-blue-500 hover:text-blue-600 font-medium transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
          <PasswordInput
            id="password"
            placeholder="Enter your password"
            error={!!form.formState.errors.password}
            {...form.register('password')}
          />
          <FormError>{form.formState.errors.password?.message}</FormError>
        </FormField>

        <Button type="submit" disabled={isLoading} className="w-full" size="lg">
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Signing in...
            </div>
          ) : (
            'Sign in'
          )}
        </Button>

        {needsConfirmation && (
          <Button
            type="button"
            variant="outline"
            disabled={isResending}
            className="w-full"
            onClick={handleResendConfirmation}
          >
            {isResending ? 'Resending...' : 'Resend confirmation email'}
          </Button>
        )}

        {onSignUp && (
          <div className="text-center mt-2">
            <p className="text-sm text-gray-600">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={onSignUp}
                className="text-blue-500 hover:text-blue-600 font-semibold transition-colors"
              >
                Sign up
              </button>
            </p>
          </div>
        )}
      </Form>
    </div>
  );
}


