import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, email, pageUrl } = body as {
      message: string;
      email?: string;
      pageUrl?: string;
    };

    if (!message || typeof message !== 'string' || message.trim().length < 1) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Try to get authenticated user (non-blocking)
    let userInfo = 'Anonymous';
    try {
      const supabase = await createServerSupabaseClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? '';
        userInfo = name ? `${name} (${user.email})` : (user.email ?? user.id);
      }
    } catch {
      // non-fatal
    }

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const threadId = process.env.TELEGRAM_THREAD_ID;

    if (!token || !chatId) {
      return NextResponse.json({ error: 'Feedback service not configured' }, { status: 503 });
    }

    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
    const lines = [
      '📬 *New Feedback*',
      '',
      `👤 *User:* ${escMd(userInfo)}`,
      email ? `📧 *Email:* ${escMd(email)}` : null,
      pageUrl ? `🔗 *Page:* ${escMd(pageUrl)}` : null,
      `🕐 *Time:* ${escMd(timestamp)}`,
      '',
      '💬 *Message:*',
      escMd(message.trim()),
    ]
      .filter((l) => l !== null)
      .join('\n');

    const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`;
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text: lines,
      parse_mode: 'MarkdownV2',
    };
    if (threadId) payload.message_thread_id = Number(threadId);

    const tgRes = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!tgRes.ok) {
      const errText = await tgRes.text();
      Sentry.captureMessage(`Telegram feedback send failed: ${errText}`, 'error');
      return NextResponse.json({ error: 'Failed to send feedback' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

/** Escape special characters for Telegram MarkdownV2 */
function escMd(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}
