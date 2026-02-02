'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { cn } from '@/lib/utils';
import { SignInForm } from './sign-in-form';
import { SignUpForm } from './sign-up-form';
import { PasswordResetForm } from './password-reset-form';

export type AuthModalMode = 'signin' | 'signup' | 'forgot-password' | 'reset-password';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialMode?: AuthModalMode;
  onSuccess?: () => void;
  className?: string;
}

export function AuthModal({
  open,
  onOpenChange,
  initialMode = 'signin',
  onSuccess,
  className
}: AuthModalProps) {
  const [mode, setMode] = React.useState<AuthModalMode>(initialMode);

  // Reset mode when modal opens
  React.useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  const handleSuccess = () => {
    onSuccess?.();
    onOpenChange(false);
  };

  const renderContent = () => {
    switch (mode) {
      case 'signin':
        return (
          <SignInForm
            onSuccess={handleSuccess}
            onForgotPassword={() => setMode('forgot-password')}
            onSignUp={() => setMode('signup')}
            className="w-full"
          />
        );
      case 'signup':
        return (
          <SignUpForm
            onSuccess={handleSuccess}
            onSignIn={() => setMode('signin')}
            className="w-full"
          />
        );
      case 'forgot-password':
        return (
          <PasswordResetForm
            mode="request"
            onSuccess={() => setMode('signin')}
            onBackToSignIn={() => setMode('signin')}
            className="w-full"
          />
        );
      case 'reset-password':
        return (
          <PasswordResetForm
            mode="reset"
            onSuccess={handleSuccess}
            onBackToSignIn={() => setMode('signin')}
            className="w-full"
          />
        );
      default:
        return null;
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
            className
          )}
        >
          <Dialog.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="sr-only">Close</span>
          </Dialog.Close>

          {renderContent()}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Trigger component for opening the modal
interface AuthModalTriggerProps {
  mode?: AuthModalMode;
  onSuccess?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function AuthModalTrigger({
  mode = 'signin',
  onSuccess,
  children,
  className
}: AuthModalTriggerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <Dialog.Trigger asChild>
        <button className={className} onClick={() => setOpen(true)}>
          {children}
        </button>
      </Dialog.Trigger>
      <AuthModal
        open={open}
        onOpenChange={setOpen}
        initialMode={mode}
        onSuccess={onSuccess}
      />
    </>
  );
}

// Hook for programmatic modal control
export function useAuthModal() {
  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<AuthModalMode>('signin');

  const openModal = (initialMode?: AuthModalMode) => {
    if (initialMode) {
      setMode(initialMode);
    }
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
  };

  return {
    open,
    mode,
    setMode,
    openModal,
    closeModal,
    AuthModal: (props: Omit<AuthModalProps, 'open' | 'onOpenChange' | 'initialMode'>) => (
      <AuthModal
        {...props}
        open={open}
        onOpenChange={setOpen}
        initialMode={mode}
      />
    )
  };
}