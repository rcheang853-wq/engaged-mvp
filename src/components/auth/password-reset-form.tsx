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

// Validation schemas
const resetRequestSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
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
}).refine(data => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

type ResetRequestData = z.infer<typeof resetRequestSchema>;
type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

interface PasswordResetFormProps {
  mode?: 'request' | 'reset';
  onSuccess?: () => void;
  onBackToSignIn?: () => void;
  className?: string;
}

export function PasswordResetForm({
  mode = 'request',
  onSuccess,
  onBackToSignIn,
  className
}: PasswordResetFormProps) {
  const { resetPassword, updatePassword, isLoading } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const requestForm = useForm<ResetRequestData>({
    resolver: zodResolver(resetRequestSchema),
    defaultValues: {
      email: '',
    },
  });

  const resetForm = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmitRequest = async (data: ResetRequestData) => {
    try {
      setError(null);
      setSuccessMessage(null);

      const result = await resetPassword(data.email);

      if (!result.success) {
        setError(result.error || 'Failed to send reset email. Please try again.');
        return;
      }

      setSuccessMessage(
        'Password reset instructions have been sent to your email address.'
      );

    } catch (err) {
      console.error('Password reset request error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const onSubmitReset = async (data: ResetPasswordData) => {
    try {
      setError(null);
      setSuccessMessage(null);

      const result = await updatePassword(data.password);

      if (!result.success) {
        setError(result.error || 'Failed to update password. Please try again.');
        return;
      }

      setSuccessMessage('Your password has been updated successfully.');

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.();
      }, 2000);

    } catch (err) {
      console.error('Password reset error:', err);
      setError('An unexpected error occurred. Please try again.');
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
            {mode === 'request' ? 'Check your email' : 'Password updated'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {successMessage}
          </p>
          {onBackToSignIn && (
            <Button
              onClick={onBackToSignIn}
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

  if (mode === 'reset') {
    return (
      <div className={className}>
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Reset your password
          </h2>
          <p className="text-sm text-gray-600 mt-2">
            Enter your new password below
          </p>
        </div>

        <Form onSubmit={resetForm.handleSubmit(onSubmitReset)}>
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
            <FormLabel htmlFor="password" required>
              New password
            </FormLabel>
            <PasswordInput
              id="password"
              placeholder="Enter your new password"
              error={!!resetForm.formState.errors.password}
              {...resetForm.register('password')}
            />
            <FormError>
              {resetForm.formState.errors.password?.message}
            </FormError>
            <p className="text-xs text-gray-500 mt-1">
              Password must contain at least 8 characters with uppercase, lowercase, and numbers
            </p>
          </FormField>

          <FormField>
            <FormLabel htmlFor="confirmPassword" required>
              Confirm new password
            </FormLabel>
            <PasswordInput
              id="confirmPassword"
              placeholder="Confirm your new password"
              error={!!resetForm.formState.errors.confirmPassword}
              {...resetForm.register('confirmPassword')}
            />
            <FormError>
              {resetForm.formState.errors.confirmPassword?.message}
            </FormError>
          </FormField>

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
                Updating password...
              </div>
            ) : (
              'Update password'
            )}
          </Button>

          {onBackToSignIn && (
            <div className="text-center">
              <button
                type="button"
                onClick={onBackToSignIn}
                className="text-sm text-blue-600 hover:text-blue-500 font-medium"
              >
                Back to sign in
              </button>
            </div>
          )}
        </Form>
      </div>
    );
  }

  // Request mode (default)
  return (
    <div className={className}>
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Forgot your password?
        </h2>
        <p className="text-sm text-gray-600 mt-2">
          Enter your email address and we'll send you a link to reset your password
        </p>
      </div>

      <Form onSubmit={requestForm.handleSubmit(onSubmitRequest)}>
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
          <FormLabel htmlFor="email" required>
            Email address
          </FormLabel>
          <FormInput
            id="email"
            type="email"
            placeholder="Enter your email address"
            error={!!requestForm.formState.errors.email}
            {...requestForm.register('email')}
          />
          <FormError>
            {requestForm.formState.errors.email?.message}
          </FormError>
        </FormField>

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
              Sending reset link...
            </div>
          ) : (
            'Send reset link'
          )}
        </Button>

        {onBackToSignIn && (
          <div className="text-center">
            <button
              type="button"
              onClick={onBackToSignIn}
              className="text-sm text-blue-600 hover:text-blue-500 font-medium"
            >
              Back to sign in
            </button>
          </div>
        )}
      </Form>
    </div>
  );
}
