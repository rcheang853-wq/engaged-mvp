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
const signUpSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your password'),
  agreeToTerms: z
    .boolean()
    .refine(val => val === true, 'You must agree to the terms and conditions'),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type SignUpFormData = z.infer<typeof signUpSchema>;

interface SignUpFormProps {
  onSuccess?: () => void;
  onSignIn?: () => void;
  className?: string;
}

export function SignUpForm({
  onSuccess,
  onSignIn,
  className
}: SignUpFormProps) {
  const { signUp, resendConfirmation, signInWithGoogle, isLoading } = useAuth();
  const [isResending, setIsResending] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = React.useState(false);
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      email: '',
      fullName: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setError(null);
      setSuccessMessage(null);
      setPendingConfirmation(false);
      setSubmittedEmail(data.email);

      const result = await signUp(data.email, data.password, data.fullName);

      if (!result.success) {
        setError(result.error || 'Failed to create account. Please try again.');
        return;
      }

      // Success - show confirmation message
      if (result.data?.requiresConfirmation) {
        setPendingConfirmation(true);
        setSuccessMessage(
          'Account created successfully! Please check your email for a confirmation link.'
        );
        return;
      }

      setSuccessMessage('Account created successfully!');
      onSuccess?.();

    } catch (err) {
      console.error('Sign up error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleResendConfirmation = async () => {
    if (!submittedEmail) {
      setError('Enter your email first so we can resend the confirmation link.');
      return;
    }

    try {
      setIsResending(true);
      setError(null);
      const result = await resendConfirmation(submittedEmail);

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

  if (successMessage) {
    return (
      <div className={className}>
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Check your email
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {successMessage}
          </p>
          {pendingConfirmation && (
            <div className="space-y-3">
              <Button
                onClick={handleResendConfirmation}
                variant="outline"
                className="w-full"
                disabled={isResending}
              >
                {isResending ? 'Resending confirmation...' : 'Resend confirmation email'}
              </Button>
              {onSignIn && (
                <Button
                  onClick={onSignIn}
                  className="w-full"
                >
                  Back to sign in
                </Button>
              )}
            </div>
          )}
          {!pendingConfirmation && onSignIn && (
            <Button
              onClick={onSignIn}
              variant="outline"
              className="w-full"
            >
              Back to sign in
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Create your account
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Join thousands of users discovering amazing events
        </p>
      </div>

      <Form onSubmit={form.handleSubmit(onSubmit)}>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        <FormField>
          <FormLabel htmlFor="fullName" required>
            Full name
          </FormLabel>
          <FormInput
            id="fullName"
            type="text"
            placeholder="Enter your full name"
            error={!!form.formState.errors.fullName}
            {...form.register('fullName')}
          />
          <FormError>
            {form.formState.errors.fullName?.message}
          </FormError>
        </FormField>

        <FormField>
          <FormLabel htmlFor="email" required>
            Email address
          </FormLabel>
          <FormInput
            id="email"
            type="email"
            placeholder="Enter your email"
            error={!!form.formState.errors.email}
            {...form.register('email')}
          />
          <FormError>
            {form.formState.errors.email?.message}
          </FormError>
        </FormField>

        <FormField>
          <FormLabel htmlFor="password" required>
            Password
          </FormLabel>
          <PasswordInput
            id="password"
            placeholder="Create a strong password"
            error={!!form.formState.errors.password}
            {...form.register('password')}
          />
          <FormError>
            {form.formState.errors.password?.message}
          </FormError>
          <p className="text-xs text-gray-500 mt-1">
            Password must contain at least 8 characters with uppercase, lowercase, and numbers
          </p>
        </FormField>

        <FormField>
          <FormLabel htmlFor="confirmPassword" required>
            Confirm password
          </FormLabel>
          <PasswordInput
            id="confirmPassword"
            placeholder="Confirm your password"
            error={!!form.formState.errors.confirmPassword}
            {...form.register('confirmPassword')}
          />
          <FormError>
            {form.formState.errors.confirmPassword?.message}
          </FormError>
        </FormField>

        <FormField>
          <div className="flex items-start">
            <div className="flex items-center h-5">
              <input
                id="agreeToTerms"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                {...form.register('agreeToTerms')}
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="agreeToTerms" className="text-gray-700">
                I agree to the{' '}
                <a href="/terms" className="text-blue-600 hover:text-blue-500 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-blue-600 hover:text-blue-500 font-medium">
                  Privacy Policy
                </a>
              </label>
            </div>
          </div>
          <FormError>
            {form.formState.errors.agreeToTerms?.message}
          </FormError>
        </FormField>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or sign up with</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={isGoogleLoading || isLoading}
          className="w-full"
          size="lg"
          onClick={async () => {
            try {
              setError(null);
              setIsGoogleLoading(true);
              const result = await signInWithGoogle();
              if (!result.success) {
                setError(result.error || 'Failed to sign up with Google');
              }
            } catch (err) {
              console.error('Google sign-up error:', err);
              setError('An unexpected error occurred. Please try again.');
            } finally {
              setIsGoogleLoading(false);
            }
          }}
        >
          {isGoogleLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting to Google...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </div>
          )}
        </Button>

        <Button
          type="submit"
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating account...
            </div>
          ) : (
            'Create account'
          )}
        </Button>

        {onSignIn && (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                type="button"
                onClick={onSignIn}
                className="text-blue-600 hover:text-blue-500 font-medium"
              >
                Sign in
              </button>
            </p>
          </div>
        )}
      </Form>
    </div>
  );
}
