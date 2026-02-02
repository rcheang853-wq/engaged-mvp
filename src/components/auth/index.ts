// Export all authentication components for easy import
export { SignInForm } from './sign-in-form';
export { SignUpForm } from './sign-up-form';
export { PasswordResetForm } from './password-reset-form';
export { AuthModal, AuthModalTrigger, useAuthModal } from './auth-modal';
export { UserMenu, UserMenuMobile } from './user-menu';
export { ProtectedRoute, withAuth } from './protected-route';

// Re-export types
export type { AuthModalMode } from './auth-modal';