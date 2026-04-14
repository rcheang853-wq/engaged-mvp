'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SignUpForm } from '@/components/auth';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, Suspense } from 'react';

const CORNERS = [
  { cls: 'kobe-corner tl', src: '/artworks/coffee_cup.png'    },
  { cls: 'kobe-corner tr', src: '/artworks/guitar_music.png'  },
  { cls: 'kobe-corner bl', src: '/artworks/walking_woman.png' },
  { cls: 'kobe-corner br', src: '/artworks/food_plate.png'    },
];

function SignUpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const redirectTo = searchParams?.get('redirectTo') || '/calendars';

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace(redirectTo);
  }, [isAuthenticated, isLoading, router, redirectTo]);

  const handleSuccess = () => {};
  const handleSignIn  = () => {
    const url = new URL('/auth/signin', window.location.origin);
    if (redirectTo !== '/calendars') url.searchParams.set('redirectTo', redirectTo);
    router.push(url.toString());
  };

  if (isLoading) return <KobeLoader />;
  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16" style={{ background: 'var(--engaged-bg)' }}>
      <Link href="/" className="flex flex-col items-center gap-2 mb-10 no-underline">
        <Image src="/logo.png" alt="Engaged" width={160} height={160} priority />
        <span className="text-[26px] font-black tracking-[-0.04em]" style={{ color: 'var(--engaged-text)' }}>Engaged</span>
      </Link>

      <div className="relative w-full max-w-[400px]">
        {CORNERS.map(({ cls, src }) => (
          <img key={cls} src={src} alt="" className={cls} aria-hidden="true"
            style={{ position: 'absolute', pointerEvents: 'none', zIndex: 10, width: 130 }} />
        ))}
        <div className="relative z-20 w-full rounded-3xl py-8 px-8 shadow-lg" style={{ background: 'var(--engaged-card)', border: '1.5px solid var(--engaged-border)' }}>
          <h2 className="text-xl font-black tracking-[-0.04em] mb-1" style={{ color: 'var(--engaged-text)' }}>Create account</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--engaged-text2)' }}>Try your friends&apos; world. Share yours.</p>
          <SignUpForm onSuccess={handleSuccess} onSignIn={handleSignIn} redirectTo={redirectTo} />
        </div>
      </div>


    </div>
  );
}

function KobeLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--engaged-bg)' }}>
      <div className="text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px]" style={{ borderColor: 'var(--engaged-border)', borderTopColor: 'var(--engaged-blue)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--engaged-text2)' }}>Loading…</p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return <Suspense fallback={<KobeLoader />}><SignUpPageContent /></Suspense>;
}
