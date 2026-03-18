import { Suspense } from 'react';
import SearchClient from './SearchClient';

export const dynamic = 'force-dynamic';

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
          <div className="animate-spin w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full" />
        </div>
      }
    >
      <SearchClient />
    </Suspense>
  );
}
