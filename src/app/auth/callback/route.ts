import { NextRequest, NextResponse } from 'next/server';
import { createMiddlewareSupabaseClient } from '@/lib/supabase/auth';

function safeRedirectPath(path: string | null | undefined) {
  if (!path) return '/calendars';
  // Only allow same-origin relative redirects
  if (!path.startsWith('/')) return '/calendars';
  return path;
}

async function ensureProfile(supabase: any) {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (existing?.id) return;

    const fullName =
      (user.user_metadata as any)?.full_name ||
      (user.user_metadata as any)?.fullName ||
      null;
    const avatarUrl = (user.user_metadata as any)?.avatar_url || null;
    const emailVerified = !!(
      (user as any).email_confirmed_at || (user as any).confirmed_at
    );

    await supabase.from('profiles').insert({
      id: user.id,
      email: user.email || '',
      full_name: fullName,
      avatar_url: avatarUrl,
      email_verified: emailVerified,
    });
  } catch {
    // best-effort only
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirectTo = safeRedirectPath(url.searchParams.get('redirectTo'));
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Always create a redirect response first so the middleware client can attach cookies.
  const redirectUrl = new URL(redirectTo, url.origin);
  let response = NextResponse.redirect(redirectUrl);

  if (errorParam) {
    const signInUrl = new URL('/auth/signin', url.origin);
    signInUrl.searchParams.set(
      'error',
      errorDescription || 'Authentication was cancelled or failed'
    );
    return NextResponse.redirect(signInUrl);
  }

  if (!code) {
    const signInUrl = new URL('/auth/signin', url.origin);
    signInUrl.searchParams.set('error', 'No authorization code received');
    return NextResponse.redirect(signInUrl);
  }

  const supabase = createMiddlewareSupabaseClient(request, response);

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const signInUrl = new URL('/auth/signin', url.origin);
    signInUrl.searchParams.set('error', error.message);
    return NextResponse.redirect(signInUrl);
  }

  // OAuth often bypasses our normal sign-in path; ensure a profiles row exists.
  await ensureProfile(supabase);

  return response;
}
