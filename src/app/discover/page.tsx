import { Suspense } from 'react';
import DiscoverClient from './DiscoverClient';

export const dynamic = 'force-dynamic';

export default function DiscoverPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <DiscoverClient />
    </Suspense>
  );
}
