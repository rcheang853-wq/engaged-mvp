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
  FormHelp,
  FormSection,
} from '@/components/ui/form-components';
import { UserProfile } from '@/types/auth';

// Validation schema
const profileSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters'),
  avatarUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  user: UserProfile;
  className?: string;
}

export function ProfileForm({ user, className }: ProfileFormProps) {
  const { updateProfile } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName || '',
      avatarUrl: user.avatarUrl || '',
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);

      const result = await updateProfile({
        fullName: data.fullName,
        avatarUrl: data.avatarUrl || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to update profile. Please try again.');
        return;
      }

      setSuccessMessage('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
    } catch (err) {
      console.error('Profile update error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <Form onSubmit={form.handleSubmit(onSubmit)}>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
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

        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        <FormSection
          title="Basic Information"
          description="Update your basic profile information"
        >
          <FormField>
            <FormLabel htmlFor="email">
              Email address
            </FormLabel>
            <FormInput
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-gray-50"
            />
            <FormHelp>
              Your email address cannot be changed. Contact support if needed.
            </FormHelp>
          </FormField>

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
            <FormLabel htmlFor="avatarUrl">
              Profile photo URL
            </FormLabel>
            <FormInput
              id="avatarUrl"
              type="url"
              placeholder="https://example.com/photo.jpg"
              error={!!form.formState.errors.avatarUrl}
              {...form.register('avatarUrl')}
            />
            <FormError>
              {form.formState.errors.avatarUrl?.message}
            </FormError>
            <FormHelp>
              Add a URL to your profile photo. Leave empty to use default avatar.
            </FormHelp>
          </FormField>
        </FormSection>

        <FormSection
          title="Account Information"
          description="View your account details"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField>
              <FormLabel>Account type</FormLabel>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  user.isPro
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {user.isPro ? 'Pro' : 'Free'}
                </span>
              </div>
            </FormField>

            <FormField>
              <FormLabel>Member since</FormLabel>
              <div className="mt-1 text-sm text-gray-900">
                {new Date(user.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </FormField>
          </div>
        </FormSection>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <Button
            type="submit"
            disabled={isLoading || !form.formState.isDirty}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <div className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </div>
            ) : (
              'Update Profile'
            )}
          </Button>
        </div>
      </Form>
    </div>
  );
}