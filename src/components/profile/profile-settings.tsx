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
  FormSection,
  PasswordInput,
} from '@/components/ui/form-components';
import { UserProfile } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

// Validation schemas
const passwordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password must be less than 128 characters'),
  confirmPassword: z
    .string()
    .min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const preferencesSchema = z.object({
  categories: z.array(z.string()).optional(),
  locations: z.array(z.string()).optional(),
  notifications: z.object({
    email: z.boolean(),
    push: z.boolean(),
  }).optional(),
  privacy: z.object({
    shareProfile: z.boolean(),
    shareActivity: z.boolean(),
  }).optional(),
});

type PasswordFormData = z.infer<typeof passwordSchema>;
type PreferencesFormData = z.infer<typeof preferencesSchema>;

interface ProfileSettingsProps {
  user: UserProfile;
  className?: string;
}

export function ProfileSettings({ user, className }: ProfileSettingsProps) {
  const { updatePassword, updateProfile, signOut, deleteAccount } = useAuth();
  const router = useRouter();
  const [activeSection, setActiveSection] = React.useState<'preferences' | 'password' | 'account'>('preferences');
  const [isPasswordLoading, setIsPasswordLoading] = React.useState(false);
  const [isPreferencesLoading, setIsPreferencesLoading] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [preferencesError, setPreferencesError] = React.useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = React.useState<string | null>(null);
  const [preferencesSuccess, setPreferencesSuccess] = React.useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = React.useState(false);

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const preferencesForm = useForm<PreferencesFormData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: {
      notifications: {
        email: user.preferences?.notifications?.email ?? true,
        push: user.preferences?.notifications?.push ?? false,
      },
      privacy: {
        shareProfile: user.preferences?.privacy?.shareProfile ?? false,
        shareActivity: user.preferences?.privacy?.shareActivity ?? false,
      },
    },
  });

  const onPasswordSubmit = async (data: PasswordFormData) => {
    try {
      setIsPasswordLoading(true);
      setPasswordError(null);
      setPasswordSuccess(null);

      const result = await updatePassword(data.newPassword, data.currentPassword);

      if (!result.success) {
        setPasswordError(result.error || 'Failed to update password. Please try again.');
        return;
      }

      setPasswordSuccess('Password updated successfully!');
      passwordForm.reset();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Password update error:', err);
      setPasswordError('An unexpected error occurred. Please try again.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const onPreferencesSubmit = async (data: PreferencesFormData) => {
    try {
      setIsPreferencesLoading(true);
      setPreferencesError(null);
      setPreferencesSuccess(null);

      const result = await updateProfile({
        preferences: data,
      });

      if (!result.success) {
        setPreferencesError(result.error || 'Failed to update preferences. Please try again.');
        return;
      }

      setPreferencesSuccess('Preferences updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => {
        setPreferencesSuccess(null);
      }, 3000);
    } catch (err) {
      console.error('Preferences update error:', err);
      setPreferencesError('An unexpected error occurred. Please try again.');
    } finally {
      setIsPreferencesLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeletingAccount(true);
      const result = await deleteAccount();

      if (!result.success) {
        console.error('Account deletion failed:', result.error);
        return;
      }

      // Account deleted successfully, user will be signed out automatically
      // Redirect to home page
      router.push('/');
    } catch (error) {
      console.error('Account deletion error:', error);
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <div className={className}>
      {/* Section Navigation */}
      <div className="mb-6">
        <nav className="flex space-x-8">
          {(['preferences', 'password', 'account'] as const).map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`text-sm font-medium capitalize ${
                activeSection === section
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {section === 'account' ? 'Account' : section}
            </button>
          ))}
        </nav>
      </div>

      {/* Preferences Section */}
      {activeSection === 'preferences' && (
        <Form onSubmit={preferencesForm.handleSubmit(onPreferencesSubmit)}>
          {preferencesError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-800">{preferencesError}</p>
            </div>
          )}

          {preferencesSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <p className="text-sm text-green-800">{preferencesSuccess}</p>
            </div>
          )}

          <FormSection
            title="Notifications"
            description="Control how you receive notifications"
          >
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="email-notifications"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  {...preferencesForm.register('notifications.email')}
                />
                <label htmlFor="email-notifications" className="ml-3 text-sm text-gray-700">
                  Email notifications
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="push-notifications"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  {...preferencesForm.register('notifications.push')}
                />
                <label htmlFor="push-notifications" className="ml-3 text-sm text-gray-700">
                  Push notifications
                </label>
              </div>
            </div>
          </FormSection>

          <FormSection
            title="Privacy"
            description="Control your privacy settings"
          >
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  id="share-profile"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  {...preferencesForm.register('privacy.shareProfile')}
                />
                <label htmlFor="share-profile" className="ml-3 text-sm text-gray-700">
                  Make profile publicly visible
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="share-activity"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  {...preferencesForm.register('privacy.shareActivity')}
                />
                <label htmlFor="share-activity" className="ml-3 text-sm text-gray-700">
                  Share activity with other users
                </label>
              </div>
            </div>
          </FormSection>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button
              type="submit"
              disabled={isPreferencesLoading || !preferencesForm.formState.isDirty}
            >
              {isPreferencesLoading ? 'Updating...' : 'Update Preferences'}
            </Button>
          </div>
        </Form>
      )}

      {/* Password Section */}
      {activeSection === 'password' && (
        <Form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
          {passwordError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
              <p className="text-sm text-red-800">{passwordError}</p>
            </div>
          )}

          {passwordSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
              <p className="text-sm text-green-800">{passwordSuccess}</p>
            </div>
          )}

          <FormSection
            title="Change Password"
            description="Update your account password"
          >
            <FormField>
              <FormLabel htmlFor="currentPassword" required>
                Current password
              </FormLabel>
              <PasswordInput
                id="currentPassword"
                placeholder="Enter your current password"
                error={!!passwordForm.formState.errors.currentPassword}
                {...passwordForm.register('currentPassword')}
              />
              <FormError>
                {passwordForm.formState.errors.currentPassword?.message}
              </FormError>
            </FormField>

            <FormField>
              <FormLabel htmlFor="newPassword" required>
                New password
              </FormLabel>
              <PasswordInput
                id="newPassword"
                placeholder="Enter your new password"
                error={!!passwordForm.formState.errors.newPassword}
                {...passwordForm.register('newPassword')}
              />
              <FormError>
                {passwordForm.formState.errors.newPassword?.message}
              </FormError>
            </FormField>

            <FormField>
              <FormLabel htmlFor="confirmPassword" required>
                Confirm new password
              </FormLabel>
              <PasswordInput
                id="confirmPassword"
                placeholder="Confirm your new password"
                error={!!passwordForm.formState.errors.confirmPassword}
                {...passwordForm.register('confirmPassword')}
              />
              <FormError>
                {passwordForm.formState.errors.confirmPassword?.message}
              </FormError>
            </FormField>
          </FormSection>

          <div className="flex justify-end pt-6 border-t border-gray-200">
            <Button
              type="submit"
              disabled={isPasswordLoading}
            >
              {isPasswordLoading ? 'Updating...' : 'Update Password'}
            </Button>
          </div>
        </Form>
      )}

      {/* Account Section */}
      {activeSection === 'account' && (
        <div className="space-y-6">
          <FormSection
            title="Account Actions"
            description="Manage your account"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Sign out</h4>
                  <p className="text-sm text-gray-500">
                    Sign out of your account on this device
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSignOut}
                >
                  Sign out
                </Button>
              </div>

              {!user.isPro && (
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Upgrade to Pro</h4>
                    <p className="text-sm text-gray-500">
                      Get access to premium features and unlimited events
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push('/pricing')}
                  >
                    Upgrade
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                <div>
                  <h4 className="text-sm font-medium text-red-900">Delete account</h4>
                  <p className="text-sm text-red-600">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  Delete
                </Button>
              </div>
            </div>
          </FormSection>
        </div>
      )}

      {/* Account Deletion Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and will permanently remove all your data."
        confirmText="Delete Account"
        variant="destructive"
        isLoading={isDeletingAccount}
      >
        <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
          <p className="text-sm text-red-800">
            <strong>Warning:</strong> This will permanently delete:
          </p>
          <ul className="mt-2 text-xs text-red-700 list-disc list-inside space-y-1">
            <li>Your profile and account information</li>
            <li>All your saved events and preferences</li>
            <li>Any calendar integrations</li>
            <li>All associated data</li>
          </ul>
        </div>
      </ConfirmationDialog>
    </div>
  );
}