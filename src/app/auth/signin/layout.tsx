import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - Engaged',
  description: 'Sign in to your Engaged account to save events, get personalized recommendations, and manage your calendar.',
  keywords: [
    'sign in',
    'login',
    'authentication',
    'account',
    'Engaged',
    'events',
    'calendar'
  ],
  openGraph: {
    title: 'Sign In - Engaged',
    description: 'Access your personal event calendar and get AI-powered event recommendations.',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Sign In - Engaged',
    description: 'Sign in to access your personalized event experience.',
  },
  robots: {
    index: false, // Don't index auth pages
    follow: false,
  },
};

export default function SignInLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}