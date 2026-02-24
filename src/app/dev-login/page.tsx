'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function DevLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const devLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/dev-auth', { method: 'POST' });
      const data = await res.json();
      
      console.log('Dev auth response:', data);
      
      if (data.success) {
        console.log('Dev bypass enabled, redirecting...');
        // Redirect immediately - the cookie is already set by the API
        window.location.href = '/calendars';
      } else {
        setError(data.error || 'Login failed');
        console.error('Dev login failed:', data);
      }
    } catch (err: any) {
      setError('Network error: ' + err.message);
      console.error('Dev login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🛠️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Dev Login</h1>
        <p className="text-gray-500 text-sm mb-6">
          Quick access for development — bypasses normal auth
        </p>
        
        <button
          onClick={devLogin}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50"
        >
          {loading ? 'Logging in...' : 'Login as Dev User'}
        </button>
        
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        
        <p className="text-xs text-gray-400 mt-4">
          This creates/uses: dev@example.com
        </p>
      </div>
    </div>
  );
}
