import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/dev-auth — set dev bypass cookie
export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Dev mode enabled' });
  
  // Set a dev bypass cookie
  response.cookies.set({
    name: 'dev-bypass',
    value: 'true',
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
  
  return response;
}
