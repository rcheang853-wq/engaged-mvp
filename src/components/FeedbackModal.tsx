'use client';

import { useState, useEffect } from 'react';
import { X, Send, MessageSquare } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: Props) {
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [pageUrl, setPageUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (open) setPageUrl(window.location.href);
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), email: email.trim() || undefined, pageUrl }),
      });
      setStatus(res.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  function handleClose() {
    setMessage('');
    setEmail('');
    setStatus('idle');
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-2xl px-4 pt-4 pb-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 rounded-full bg-[#E5E7EB]" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-[#3B82F6]" />
            <h2 className="text-base font-bold text-[#111827]">Send Feedback</h2>
          </div>
          <button onClick={handleClose} className="p-1 text-[#9CA3AF] hover:text-[#6B7280]">
            <X size={20} />
          </button>
        </div>

        {status === 'success' ? (
          <div className="text-center py-8">
            <p className="text-2xl mb-2">🙏</p>
            <p className="text-sm font-semibold text-[#111827]">Thanks for your feedback!</p>
            <p className="text-xs text-[#6B7280] mt-1">We read every message.</p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 bg-[#3B82F6] text-white text-sm font-semibold rounded-xl"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#374151] mb-1 block">
                Message <span className="text-[#EF4444]">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What's on your mind?"
                rows={4}
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#3B82F6] resize-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#374151] mb-1 block">
                Email <span className="text-[#9CA3AF] font-normal">(optional – for follow-up)</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full border border-[#E5E7EB] rounded-xl px-3 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#3B82F6]"
              />
            </div>
            {status === 'error' && (
              <p className="text-xs text-[#EF4444]">Something went wrong. Please try again.</p>
            )}
            <button
              type="submit"
              disabled={status === 'loading' || !message.trim()}
              className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] text-white text-sm font-semibold py-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={15} />
              {status === 'loading' ? 'Sending…' : 'Send Feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
